"""Nodes for menu_clusterer fetch, clustering, and persistence."""

from __future__ import annotations

import json
from typing import Any

import httpx
from agents_app.agents.core.milestone_run.graphql_client import upsert_milestonedata_node
from agents_app.agents.core.milestone_run.menu_clusterer.cluster import (
    build_per_category_signature_clusters,
    distinct_categories_with_stars,
)
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
)
from langgraph.config import get_stream_writer


def _trace(state: MenuClustererState, step: str, **extra: Any) -> None:
    payload: dict[str, Any] = {"step": step, **extra}
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
            "menu_clusterer requires a prior menu_tagger milestone with saved tagged items"
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
        "target_group_count": len(available_categories),
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

    _trace(
        state,
        "build_clusters",
        targetGroupCount=int(state.get("target_group_count") or 0),
    )

    payload = build_per_category_signature_clusters(
        menu_tagger_items,
        campaign_brief_data=campaign_brief_data,
        source_menu_tagger_title=str(state.get("source_menu_tagger_title") or ""),
        source_campaign_brief_title=str(state.get("source_campaign_brief_title") or ""),
        notes=owner_notes,
    )
    normalized = _normalize_generated_output(payload)
    return {"generated_output": normalized}


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
