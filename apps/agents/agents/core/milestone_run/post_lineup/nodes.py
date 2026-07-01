"""Nodes for post_lineup fetch, LLM planning, and persistence."""

from __future__ import annotations

import json
from typing import Any

import httpx
from agents_app.agents.core.llm_invoke import LLMInvokeError, emit_llm_error_step
from agents_app.agents.core.milestone_run.graphql_client import upsert_milestonedata_node
from agents_app.agents.core.milestone_run.llm_from_run_config import (
    structured_ainvoke_from_run_config,
)
from agents_app.agents.core.milestone_run.output_schema import validate_skill_output
from agents_app.agents.core.milestone_run.post_lineup.build import build_post_lineup_output
from agents_app.agents.core.milestone_run.post_lineup.prompts import (
    format_post_lineup_top_five_system,
)
from agents_app.agents.core.milestone_run.post_lineup.state import PostLineupOutput, PostLineupState
from agents_app.agents.core.milestone_run.post_lineup.top_five import (
    PostLineupTopFiveDraft,
    build_top_five_posts_from_draft,
    prepare_top_five_categories_from_clusterer,
    validate_top_five_drafts,
)
from agents_app.agents.core.milestone_run.prior_context_inject import (
    campaign_brief_prior_error_message,
    dates_prior_error_message,
    extract_dates_data,
    extract_dates_row,
    extract_menu_clusterer_data,
    extract_menu_clusterer_row,
    extract_menu_tagger_data,
    extract_menu_tagger_row,
    extract_restaurant_campaign_brief_data,
    extract_restaurant_campaign_brief_row,
    menu_clusterer_prior_error_message,
    menu_tagger_prior_error_message,
)
from langchain_core.messages import HumanMessage, SystemMessage
from langgraph.config import get_stream_writer


def _trace(state: PostLineupState, step: str, **extra: Any) -> None:
    payload: dict[str, Any] = {"step": step, **extra}
    run_id = state.get("run_id")
    if isinstance(run_id, str) and run_id:
        payload["run_id"] = run_id
    get_stream_writer()(payload)


def _trace_agent_event(state: PostLineupState, kind: str, **extra: Any) -> None:
    payload: dict[str, Any] = {"agent_event": {"kind": kind, **extra}}
    run_id = state.get("run_id")
    if isinstance(run_id, str) and run_id:
        payload["run_id"] = run_id
    get_stream_writer()(payload)


def _fmt_owner_notes(state: PostLineupState) -> str:
    raw = state.get("milestone_input")
    if not isinstance(raw, dict):
        return ""
    if raw.get("type") != "post_lineup":
        return ""
    value = raw.get("value")
    if not isinstance(value, dict):
        return ""
    notes = value.get("notes")
    if not isinstance(notes, str):
        return ""
    text = notes.strip()
    if not text:
        return ""
    return (
        "## Milestone input (owner notes)\n\n"
        "_Optional owner guidance for post emphasis. Treat as hints, not verified facts._\n\n"
        f"{text}"
    )


def _compact_tagger_item_for_llm(item: dict[str, Any]) -> dict[str, Any]:
    raw_tags = item.get("tags")
    tags: dict[str, Any] = raw_tags if isinstance(raw_tags, dict) else {}
    return {
        "name": str(item.get("name") or "").strip(),
        "role": item.get("role"),
        "category": item.get("category"),
        "storytellingFit": item.get("storytellingFit"),
        "popularity": item.get("popularity"),
        "tags": {
            "kind": tags.get("kind"),
            "taste": tags.get("taste"),
            "course": tags.get("course"),
            "texture": tags.get("texture"),
            "prep_style": tags.get("prep_style"),
            "content_angle": tags.get("content_angle"),
            "reel_moment": tags.get("reel_moment"),
        },
    }


def _top_five_llm_categories(category_payloads: list[dict[str, Any]]) -> list[dict[str, Any]]:
    llm_categories: list[dict[str, Any]] = []
    for row in category_payloads:
        if not isinstance(row, dict):
            continue
        category = str(row.get("category") or "").strip()
        if not category:
            continue
        star_items = row.get("starItems")
        tagged_items: list[dict[str, Any]] = []
        if isinstance(star_items, list):
            tagged_items = [
                _compact_tagger_item_for_llm(item)
                for item in star_items
                if isinstance(item, dict) and str(item.get("name") or "").strip()
            ]
        llm_categories.append(
            {
                "category": category,
                "signatureItems": row.get("signatureItems"),
                "taggedItems": tagged_items,
            }
        )
    return llm_categories


def _normalize_generated_output(payload: Any) -> PostLineupOutput:
    if not isinstance(payload, dict):
        raise ValueError("post_lineup output validation failed")
    normalized, error = validate_skill_output("post_lineup", payload)
    if error is not None or not isinstance(normalized, dict):
        raise ValueError(error or "post_lineup output validation failed")
    return normalized  # type: ignore[return-value]


async def fetch_and_prepare(state: PostLineupState, *, client: httpx.AsyncClient) -> dict[str, Any]:
    del client
    _trace(state, "execute_skill", skill_id="post_lineup")

    prior_json = str(state.get("prior_milestones_data") or "")
    dates_data = extract_dates_data(prior_json)
    if dates_data is None:
        raise ValueError(dates_prior_error_message(prior_json, milestone_id="post_lineup"))

    start_date = str(dates_data.get("startDate") or "").strip()
    end_date = str(dates_data.get("endDate") or "").strip()
    if not start_date or not end_date:
        raise ValueError("post_lineup requires prior dates milestone with startDate and endDate")

    campaign_brief_data = extract_restaurant_campaign_brief_data(prior_json)
    if campaign_brief_data is None:
        raise ValueError(campaign_brief_prior_error_message(prior_json, milestone_id="post_lineup"))

    menu_tagger_data = extract_menu_tagger_data(prior_json)
    if menu_tagger_data is None:
        raise ValueError(menu_tagger_prior_error_message(prior_json, milestone_id="post_lineup"))

    menu_clusterer_data = extract_menu_clusterer_data(prior_json)
    if menu_clusterer_data is None:
        raise ValueError(menu_clusterer_prior_error_message(prior_json, milestone_id="post_lineup"))

    campaign_brief_row = extract_restaurant_campaign_brief_row(prior_json)
    source_campaign_brief_title = ""
    if isinstance(campaign_brief_row, dict):
        brief_title = campaign_brief_row.get("title")
        if isinstance(brief_title, str) and brief_title.strip():
            source_campaign_brief_title = brief_title.strip()

    menu_tagger_row = extract_menu_tagger_row(prior_json)
    source_menu_tagger_title = ""
    if isinstance(menu_tagger_row, dict):
        title = menu_tagger_row.get("title")
        if isinstance(title, str) and title.strip():
            source_menu_tagger_title = title.strip()

    dates_row = extract_dates_row(prior_json)
    source_dates_title = ""
    if isinstance(dates_row, dict):
        title = dates_row.get("title")
        if isinstance(title, str) and title.strip():
            source_dates_title = title.strip()

    menu_clusterer_row = extract_menu_clusterer_row(prior_json)
    source_menu_clusterer_title = ""
    if isinstance(menu_clusterer_row, dict):
        clusterer_title = menu_clusterer_row.get("title")
        if isinstance(clusterer_title, str) and clusterer_title.strip():
            source_menu_clusterer_title = clusterer_title.strip()

    top_five_categories = prepare_top_five_categories_from_clusterer(
        menu_clusterer_data,
        menu_tagger_data,
    )

    return {
        "owner_notes_markdown": _fmt_owner_notes(state),
        "dates_data": dates_data,
        "start_date": start_date,
        "end_date": end_date,
        "source_dates_title": source_dates_title,
        "campaign_brief_data": campaign_brief_data,
        "source_campaign_brief_title": source_campaign_brief_title,
        "menu_clusterer_data": menu_clusterer_data,
        "source_menu_clusterer_title": source_menu_clusterer_title,
        "menu_tagger_data": menu_tagger_data,
        "source_menu_tagger_title": source_menu_tagger_title,
        "top_five_categories": top_five_categories,
    }


async def generate_top_five_posts(state: PostLineupState) -> dict[str, Any]:
    """Use LLM to write Top 5 carousel copy for each category's signature items."""
    category_payloads = state.get("top_five_categories")
    if not isinstance(category_payloads, list) or not category_payloads:
        return {"top_five_posts": []}

    campaign_brief_data = state.get("campaign_brief_data")
    if not isinstance(campaign_brief_data, dict):
        raise ValueError("post_lineup requires prior restaurant_campaign_brief milestone data")

    menu_tagger_data = state.get("menu_tagger_data")
    if not isinstance(menu_tagger_data, dict):
        raise ValueError("post_lineup requires prior menu_tagger milestone data")

    brief_excerpt = {
        "venueSnapshot": campaign_brief_data.get("venueSnapshot"),
        "overallStrategy": campaign_brief_data.get("overallStrategy"),
        "campaignObjective": campaign_brief_data.get("campaignObjective"),
        "toneGuardrails": campaign_brief_data.get("toneGuardrails"),
        "offerAndCtaPlan": campaign_brief_data.get("offerAndCtaPlan"),
        "messageHierarchy": campaign_brief_data.get("messageHierarchy"),
        "mainCategory": campaign_brief_data.get("mainCategory"),
        "contentPillars": campaign_brief_data.get("contentPillars"),
    }
    llm_payload: dict[str, Any] = {
        "campaignBrief": brief_excerpt,
        "menuClusterer": {
            "sourceTitle": str(state.get("source_menu_clusterer_title") or "").strip(),
            "categories": _top_five_llm_categories(category_payloads),
        },
    }
    owner_md = str(state.get("owner_notes_markdown") or "").strip()
    if owner_md:
        llm_payload["ownerNotes"] = owner_md

    human_content = json.dumps(llm_payload, ensure_ascii=False, indent=2)

    _trace_agent_event(state, "chat_model_start")
    try:
        generated = await structured_ainvoke_from_run_config(
            PostLineupTopFiveDraft,
            [
                SystemMessage(content=format_post_lineup_top_five_system()),
                HumanMessage(content=human_content),
            ],
        )
    except LLMInvokeError as exc:
        emit_llm_error_step(exc.code, str(exc))
        raise ValueError(str(exc)) from exc
    _trace_agent_event(state, "chat_model_end")

    expected_categories = {
        str(row.get("category") or "").strip()
        for row in category_payloads
        if isinstance(row, dict) and str(row.get("category") or "").strip()
    }
    drafts = validate_top_five_drafts(
        generated.posts,
        expected_categories=expected_categories,
        category_payloads=category_payloads,
    )
    built = build_top_five_posts_from_draft(
        drafts,
        category_payloads=category_payloads,
    )
    return {"top_five_posts": built}


async def finalize_output(state: PostLineupState) -> dict[str, Any]:
    """Assemble validated post_lineup milestone output from Top 5 posts only."""
    start_date = str(state.get("start_date") or "").strip()
    end_date = str(state.get("end_date") or "").strip()
    if not start_date or not end_date:
        raise ValueError("post_lineup requires start_date and end_date from prior dates milestone")

    top_five_posts = state.get("top_five_posts")
    if not isinstance(top_five_posts, list):
        top_five_posts = []

    owner_notes = ""
    owner_md = str(state.get("owner_notes_markdown") or "").strip()
    if owner_md:
        owner_notes = owner_md.split("\n\n", 2)[-1].strip() if "\n\n" in owner_md else owner_md

    payload = build_post_lineup_output(
        top_five_posts=top_five_posts,
        start_date=start_date,
        end_date=end_date,
        source_campaign_brief_title=str(state.get("source_campaign_brief_title") or ""),
        source_menu_clusterer_title=str(state.get("source_menu_clusterer_title") or ""),
        source_menu_tagger_title=str(state.get("source_menu_tagger_title") or ""),
        source_dates_title=str(state.get("source_dates_title") or ""),
        notes=owner_notes,
    )
    normalized = _normalize_generated_output(payload)
    return {"generated_output": normalized}


async def persist_result(state: PostLineupState, *, client: httpx.AsyncClient) -> dict[str, Any]:
    payload = _normalize_generated_output(state.get("generated_output"))
    await upsert_milestonedata_node(
        str(state["milestone_id"]),
        int(state["location_id"]),
        payload,
        str(state["user_id"]),
        client=client,
    )
    result_data = json.dumps(payload, ensure_ascii=False, indent=2)
    return {
        "result_data": result_data,
        "milestone_data": payload,
        "milestonedata_written": True,
        "raw_data": result_data,
    }
