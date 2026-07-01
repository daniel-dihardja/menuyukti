"""Nodes for menu_clusterer fetch, clustering, and persistence."""

from __future__ import annotations

import json
from typing import Any

import httpx
from agents_app.agents.core.llm_invoke import LLMInvokeError, emit_llm_error_step
from agents_app.agents.core.milestone_run.graphql_client import upsert_milestonedata_node
from agents_app.agents.core.milestone_run.llm_from_run_config import (
    structured_ainvoke_from_run_config,
)
from agents_app.agents.core.milestone_run.menu_clusterer.cluster import (
    MENU_CLUSTERER_MIN_GROUP_COUNT,
    build_per_category_top_five_clusters,
    clusterable_menu_items,
    combine_hybrid_clusterer_output,
    derive_target_group_count,
    distinct_categories_with_stars,
    merge_llm_clusters,
    rank_top_food_leads,
)
from agents_app.agents.core.milestone_run.menu_clusterer.prompts import format_menu_clusterer_system
from agents_app.agents.core.milestone_run.menu_clusterer.state import (
    MenuClustererOutput,
    MenuClustererState,
)
from agents_app.agents.core.milestone_run.output_schema import validate_skill_output
from agents_app.agents.core.milestone_run.prior_context_inject import (
    campaign_brief_prior_error_message,
    extract_menu_tagger_data,
    extract_menu_tagger_row,
    extract_restaurant_campaign_brief_data,
    extract_restaurant_campaign_brief_row,
    menu_tagger_prior_error_message,
)
from langchain_core.messages import BaseMessage, HumanMessage, SystemMessage
from langgraph.config import get_stream_writer
from pydantic import BaseModel, Field, create_model


def _trace(state: MenuClustererState, step: str, **extra: Any) -> None:
    payload: dict[str, Any] = {"step": step, **extra}
    run_id = state.get("run_id")
    if isinstance(run_id, str) and run_id:
        payload["run_id"] = run_id
    get_stream_writer()(payload)


def _trace_agent_event(state: MenuClustererState, kind: str, **extra: Any) -> None:
    payload: dict[str, Any] = {"agent_event": {"kind": kind, **extra}}
    run_id = state.get("run_id")
    if isinstance(run_id, str) and run_id:
        payload["run_id"] = run_id
    get_stream_writer()(payload)


def _fmt_owner_notes(state: MenuClustererState) -> str:
    raw = state.get("milestone_input")
    if not isinstance(raw, dict):
        return ""
    if raw.get("type") != "menu_clusterer":
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
        "_Optional owner guidance for grouping emphasis. Treat as hints, not verified facts._\n\n"
        f"{text}"
    )


def _menu_tagger_items(data: dict[str, Any]) -> list[dict[str, Any]]:
    raw_items = data.get("items")
    if not isinstance(raw_items, list):
        return []
    return [row for row in raw_items if isinstance(row, dict)]


def _normalize_generated_output(payload: Any) -> MenuClustererOutput:
    if not isinstance(payload, dict):
        raise ValueError("menu_clusterer output validation failed")
    normalized, error = validate_skill_output("menu_clusterer", payload)
    if error is not None or not isinstance(normalized, dict):
        raise ValueError(error or "menu_clusterer output validation failed")
    return normalized  # type: ignore[return-value]


class MenuClustererClusterDraft(BaseModel):
    themeLabel: str
    leadItemName: str
    supportingItemNames: list[str] = Field(default_factory=list, max_length=4)
    clusterDescription: str = Field(
        min_length=40,
        description=(
            "Why these items are grouped, why the angle fits this venue's concept, "
            "and why it works as a Reel."
        ),
    )


def _menu_clusterer_draft_output_model(min_groups: int) -> type[BaseModel]:
    return create_model(
        "MenuClustererDraftOutput",
        clusters=(list[MenuClustererClusterDraft], Field(min_length=min_groups)),
        __base__=BaseModel,
    )


MENU_CLUSTERER_MERGE_MAX_ATTEMPTS = 3


def _merge_correction_message(error: ValueError) -> HumanMessage:
    return HumanMessage(
        content=(
            "Your previous cluster draft could not be merged with the menu data.\n\n"
            f"Error: {error}\n\n"
            "Return a corrected JSON object only. Use exact item names from the tagged menu list, "
            "choose leadItemName only from the top popularity score-tier lead list, ensure every tagged menu item "
            "appears in at least one cluster, and keep each clusterDescription at least 40 characters."
        )
    )


def _compact_menu_item(item: dict[str, Any]) -> dict[str, Any]:
    return {
        "name": str(item.get("name") or "").strip(),
        "role": item.get("role"),
        "category": item.get("category"),
        "popularity": item.get("popularity"),
        "storytellingFit": item.get("storytellingFit"),
        "tags": item.get("tags"),
    }


def _build_generation_context(
    *,
    campaign_brief_data: dict[str, Any],
    menu_tagger_items: list[dict[str, Any]],
    top5_leads: list[dict[str, Any]],
    owner_notes_markdown: str,
    target_group_count: int,
) -> str:
    brief_excerpt = {
        "venueSnapshot": campaign_brief_data.get("venueSnapshot"),
        "overallStrategy": campaign_brief_data.get("overallStrategy"),
        "contentPillars": campaign_brief_data.get("contentPillars"),
        "audienceHypotheses": campaign_brief_data.get("audienceHypotheses"),
        "proofOrientedAngles": campaign_brief_data.get("proofOrientedAngles"),
    }
    tagged_items = [_compact_menu_item(item) for item in clusterable_menu_items(menu_tagger_items)]
    top5_names = [str(item.get("name") or "").strip() for item in top5_leads]

    sections = [
        f"## Target cluster count\nProduce exactly **{target_group_count}** Reel hook clusters "
        "(derived from the tagged menu size).",
        "## Full menu coverage\nEvery tagged menu item listed below must appear in at least one "
        "cluster (as leadItemName or supportingItemNames). Items may repeat across clusters.",
        "## Campaign brief (excerpt)\n```json\n"
        f"{json.dumps(brief_excerpt, ensure_ascii=False, indent=2)}\n```",
        "## Top popularity score-tier leads (position 1 must come from this list; ties included)\n```json\n"
        f"{json.dumps(top5_names, ensure_ascii=False, indent=2)}\n```",
        "## Tagged menu items\n```json\n"
        f"{json.dumps(tagged_items, ensure_ascii=False, indent=2)}\n```",
    ]
    if owner_notes_markdown.strip():
        sections.append(owner_notes_markdown.strip())
    return "\n\n".join(sections)


def _main_category_from_brief(campaign_brief_data: dict[str, Any]) -> str:
    return str(campaign_brief_data.get("mainCategory") or "").strip()


async def fetch_and_prepare(
    state: MenuClustererState, *, client: httpx.AsyncClient
) -> dict[str, Any]:
    del client
    _trace(state, "execute_skill", skill_id="menu_clusterer")

    prior_json = str(state.get("prior_milestones_data") or "")
    campaign_brief_data = extract_restaurant_campaign_brief_data(prior_json)
    if campaign_brief_data is None:
        raise ValueError(
            campaign_brief_prior_error_message(prior_json, milestone_id="menu_clusterer")
        )

    menu_tagger_data = extract_menu_tagger_data(prior_json)
    if menu_tagger_data is None:
        raise ValueError(
            menu_tagger_prior_error_message(prior_json, milestone_id="menu_clusterer")
        )

    menu_tagger_items = _menu_tagger_items(menu_tagger_data)
    if not menu_tagger_items:
        raise ValueError(
            "menu_clusterer requires at least one tagged item in prior menu_tagger data"
        )

    main_category = _main_category_from_brief(campaign_brief_data)
    available_categories = distinct_categories_with_stars(
        menu_tagger_items,
        main_category=main_category,
    )
    if not available_categories:
        raise ValueError(
            "menu_clusterer requires at least one star item in prior menu_tagger data; "
            "re-run promotion_candidates or widen category selection"
        )

    tagged_count = len(clusterable_menu_items(menu_tagger_items))
    hook_target_group_count = derive_target_group_count(tagged_count)
    if tagged_count < hook_target_group_count:
        raise ValueError(
            f"menu_clusterer requires at least {hook_target_group_count} tagged menu items in prior "
            f"menu_tagger data; got {tagged_count}. Re-run menu_tagger or widen promotion candidates."
        )
    if tagged_count < MENU_CLUSTERER_MIN_GROUP_COUNT:
        raise ValueError(
            f"menu_clusterer requires at least {MENU_CLUSTERER_MIN_GROUP_COUNT} tagged menu items in prior "
            f"menu_tagger data; got {tagged_count}. Re-run menu_tagger or widen promotion candidates."
        )

    campaign_brief_row = extract_restaurant_campaign_brief_row(prior_json)
    source_campaign_brief_title = ""
    if isinstance(campaign_brief_row, dict):
        brief_title = campaign_brief_row.get("title")
        if isinstance(brief_title, str) and brief_title.strip():
            source_campaign_brief_title = brief_title.strip()

    menu_tagger_row = extract_menu_tagger_row(prior_json)
    source_title = ""
    if isinstance(menu_tagger_row, dict):
        title = menu_tagger_row.get("title")
        if isinstance(title, str) and title.strip():
            source_title = title.strip()

    return {
        "owner_notes_markdown": _fmt_owner_notes(state),
        "campaign_brief_data": campaign_brief_data,
        "source_campaign_brief_title": source_campaign_brief_title,
        "menu_tagger_items": menu_tagger_items,
        "source_menu_tagger_title": source_title,
        "target_group_count": hook_target_group_count,
        "top_five_group_count": len(available_categories),
    }


async def build_clusters(state: MenuClustererState) -> dict[str, Any]:
    menu_tagger_items = state.get("menu_tagger_items") or []
    campaign_brief_data = state.get("campaign_brief_data")
    if not isinstance(campaign_brief_data, dict):
        raise ValueError("menu_clusterer requires campaign_brief_data")

    owner_notes = ""
    owner_md = str(state.get("owner_notes_markdown") or "").strip()
    if owner_md:
        owner_notes = owner_md.split("\n\n", 2)[-1].strip() if "\n\n" in owner_md else owner_md

    source_menu_tagger_title = str(state.get("source_menu_tagger_title") or "")
    source_campaign_brief_title = str(state.get("source_campaign_brief_title") or "")
    hook_target_group_count = int(state.get("target_group_count") or MENU_CLUSTERER_MIN_GROUP_COUNT)

    top_five_payload = build_per_category_top_five_clusters(
        menu_tagger_items,
        campaign_brief_data=campaign_brief_data,
        source_menu_tagger_title=source_menu_tagger_title,
        source_campaign_brief_title=source_campaign_brief_title,
        notes=owner_notes,
    )

    top5_leads = rank_top_food_leads(menu_tagger_items)
    generation_context = _build_generation_context(
        campaign_brief_data=campaign_brief_data,
        menu_tagger_items=menu_tagger_items,
        top5_leads=top5_leads,
        owner_notes_markdown=str(state.get("owner_notes_markdown") or ""),
        target_group_count=hook_target_group_count,
    )

    draft_output_model = _menu_clusterer_draft_output_model(hook_target_group_count)
    system_prompt = format_menu_clusterer_system(
        target_group_count=hook_target_group_count,
        min_group_count=MENU_CLUSTERER_MIN_GROUP_COUNT,
    )

    _trace(
        state,
        "build_clusters_generate",
        targetGroupCount=hook_target_group_count,
        topFiveGroupCount=int(state.get("top_five_group_count") or 0),
    )
    _trace_agent_event(state, "chat_model_start")

    base_messages: list[BaseMessage] = [
        SystemMessage(content=system_prompt),
        HumanMessage(content=generation_context),
    ]
    merge_error: ValueError | None = None

    for attempt in range(1, MENU_CLUSTERER_MERGE_MAX_ATTEMPTS + 1):
        messages = list(base_messages)
        if merge_error is not None:
            messages.append(_merge_correction_message(merge_error))
        try:
            generated = await structured_ainvoke_from_run_config(
                draft_output_model,
                messages,
            )
        except LLMInvokeError as exc:
            emit_llm_error_step(exc.code, str(exc))
            raise

        try:
            clusters = getattr(generated, "clusters", None)
            if not isinstance(clusters, list):
                raise ValueError("menu_clusterer LLM draft missing clusters")
            hook_payload = merge_llm_clusters(
                clusters,
                menu_tagger_items=menu_tagger_items,
                top5_leads=top5_leads,
                campaign_brief_data=campaign_brief_data,
                source_menu_tagger_title=source_menu_tagger_title,
                source_campaign_brief_title=source_campaign_brief_title,
                notes=owner_notes,
                target_group_count=hook_target_group_count,
                include_menu_highlight=False,
            )
            payload = combine_hybrid_clusterer_output(
                hook_payload=hook_payload,
                top_five_payload=top_five_payload,
                menu_tagger_items=menu_tagger_items,
            )
            normalized = _normalize_generated_output(payload)
            return {"generated_output": normalized}
        except ValueError as exc:
            merge_error = exc
            if attempt >= MENU_CLUSTERER_MERGE_MAX_ATTEMPTS:
                raise ValueError(
                    f"menu_clusterer clustering failed after {attempt} attempts: {exc}"
                ) from exc

    raise ValueError("menu_clusterer clustering failed")


async def persist_result(state: MenuClustererState, *, client: httpx.AsyncClient) -> dict[str, Any]:
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
