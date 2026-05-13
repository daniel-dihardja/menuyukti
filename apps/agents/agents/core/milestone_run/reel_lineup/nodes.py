"""Nodes for reel_lineup fetch, clustering, and persistence."""

from __future__ import annotations

import json
from typing import Any

import httpx
from agents_app.agents.core.milestone_run.graphql_client import upsert_milestonedata_node
from agents_app.agents.core.milestone_run.output_schema import validate_skill_output
from agents_app.agents.core.milestone_run.prior_context_inject import (
    extract_menu_tagger_data,
    extract_menu_tagger_row,
    extract_promotion_candidates_data,
)
from agents_app.agents.core.milestone_run.reel_lineup.cluster import build_reel_lineup
from agents_app.agents.core.milestone_run.reel_lineup.state import ReelLineupOutput, ReelLineupState
from langgraph.config import get_stream_writer


def _trace(state: ReelLineupState, step: str, **extra: Any) -> None:
    payload: dict[str, Any] = {"step": step, **extra}
    run_id = state.get("run_id")
    if isinstance(run_id, str) and run_id:
        payload["run_id"] = run_id
    get_stream_writer()(payload)


def _fmt_owner_notes(state: ReelLineupState) -> str:
    raw = state.get("milestone_input")
    if not isinstance(raw, dict):
        return ""
    if raw.get("type") != "reel_lineup":
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


def _normalize_generated_output(payload: Any) -> ReelLineupOutput:
    if not isinstance(payload, dict):
        raise ValueError("reel_lineup output validation failed")
    normalized, error = validate_skill_output("reel_lineup", payload)
    if error is not None or not isinstance(normalized, dict):
        raise ValueError(error or "reel_lineup output validation failed")
    return normalized  # type: ignore[return-value]


async def fetch_and_prepare(state: ReelLineupState, *, client: httpx.AsyncClient) -> dict[str, Any]:
    del client
    _trace(state, "execute_skill", skill_id="reel_lineup")

    prior_json = str(state.get("prior_milestones_data") or "")
    menu_tagger_data = extract_menu_tagger_data(prior_json)
    if menu_tagger_data is None:
        raise ValueError(
            "reel_lineup requires a prior menu_tagger milestone with saved tagged items"
        )

    promotion_data = extract_promotion_candidates_data(prior_json)
    if promotion_data is None:
        raise ValueError(
            "reel_lineup requires a prior promotion_candidates milestone with saved data"
        )

    menu_tagger_items = _menu_tagger_items(menu_tagger_data)
    if not menu_tagger_items:
        raise ValueError("reel_lineup requires at least one tagged item in prior menu_tagger data")

    menu_tagger_row = extract_menu_tagger_row(prior_json)
    source_title = ""
    if isinstance(menu_tagger_row, dict):
        title = menu_tagger_row.get("title")
        if isinstance(title, str) and title.strip():
            source_title = title.strip()

    return {
        "owner_notes_markdown": _fmt_owner_notes(state),
        "menu_tagger_items": menu_tagger_items,
        "promotion_candidates_data": promotion_data,
        "source_menu_tagger_title": source_title,
    }


async def build_lineup(state: ReelLineupState) -> dict[str, Any]:
    menu_tagger_items = state.get("menu_tagger_items") or []
    promotion_data = state.get("promotion_candidates_data")
    if not isinstance(promotion_data, dict):
        raise ValueError("reel_lineup missing promotion_candidates_data")

    owner_notes = ""
    owner_md = str(state.get("owner_notes_markdown") or "").strip()
    if owner_md:
        owner_notes = owner_md.split("\n\n", 2)[-1].strip() if "\n\n" in owner_md else owner_md

    generated_output = build_reel_lineup(
        menu_tagger_items=menu_tagger_items,
        promotion_candidates=promotion_data,
        source_menu_tagger_title=str(state.get("source_menu_tagger_title") or ""),
        notes=owner_notes,
    )
    normalized = _normalize_generated_output(generated_output)
    return {"generated_output": normalized}


async def persist_result(state: ReelLineupState, *, client: httpx.AsyncClient) -> dict[str, Any]:
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
