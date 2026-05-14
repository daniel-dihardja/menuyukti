"""Nodes for post_lineup fetch, build, and persistence."""

from __future__ import annotations

import json
from typing import Any

import httpx
from agents_app.agents.core.milestone_run.graphql_client import upsert_milestonedata_node
from agents_app.agents.core.milestone_run.output_schema import validate_skill_output
from agents_app.agents.core.milestone_run.post_lineup.build import build_post_lineup
from agents_app.agents.core.milestone_run.post_lineup.state import PostLineupOutput, PostLineupState
from agents_app.agents.core.milestone_run.prior_context_inject import (
    extract_reel_lineup_data,
    extract_reel_lineup_row,
)
from langgraph.config import get_stream_writer


def _trace(state: PostLineupState, step: str, **extra: Any) -> None:
    payload: dict[str, Any] = {"step": step, **extra}
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


def _food_leads(data: dict[str, Any]) -> list[dict[str, Any]]:
    raw_items = data.get("foodLeads")
    if not isinstance(raw_items, list):
        return []
    return [row for row in raw_items if isinstance(row, dict)]


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
    reel_lineup_data = extract_reel_lineup_data(prior_json)
    if reel_lineup_data is None:
        raise ValueError(
            "post_lineup requires a prior reel_lineup milestone with saved food leads"
        )

    food_leads = _food_leads(reel_lineup_data)
    if not food_leads:
        raise ValueError("post_lineup requires at least one food lead in prior reel_lineup data")

    reel_lineup_row = extract_reel_lineup_row(prior_json)
    source_title = ""
    if isinstance(reel_lineup_row, dict):
        title = reel_lineup_row.get("title")
        if isinstance(title, str) and title.strip():
            source_title = title.strip()

    return {
        "owner_notes_markdown": _fmt_owner_notes(state),
        "food_leads": food_leads,
        "source_reel_lineup_title": source_title,
    }


async def build_posts(state: PostLineupState) -> dict[str, Any]:
    food_leads = state.get("food_leads") or []

    owner_notes = ""
    owner_md = str(state.get("owner_notes_markdown") or "").strip()
    if owner_md:
        owner_notes = owner_md.split("\n\n", 2)[-1].strip() if "\n\n" in owner_md else owner_md

    generated_output = build_post_lineup(
        food_leads=food_leads,
        source_reel_lineup_title=str(state.get("source_reel_lineup_title") or ""),
        notes=owner_notes,
    )
    normalized = _normalize_generated_output(generated_output)
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
