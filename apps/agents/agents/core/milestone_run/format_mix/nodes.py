"""Nodes for format-mix milestone: load campaign brief from priors, persist stub payload (no LLM)."""

from __future__ import annotations

import json
from typing import Any

import httpx
from agents_app.agents.core.milestone_run.format_mix.state import FormatMixState
from agents_app.agents.core.milestone_run.graphql_client import upsert_milestonedata_node
from agents_app.agents.core.milestone_run.output_schema import validate_skill_output
from agents_app.agents.core.milestone_run.prior_context_inject import (
    build_injected_prior_context_markdown,
    extract_restaurant_campaign_brief_data,
)
from langgraph.config import get_stream_writer


def _trace(state: FormatMixState, step: str, **extra: Any) -> None:
    payload: dict[str, Any] = {"step": step, **extra}
    run_id = state.get("run_id")
    if isinstance(run_id, str) and run_id:
        payload["run_id"] = run_id
    get_stream_writer()(payload)


async def fetch_campaign_brief_context(state: FormatMixState, *, client: httpx.AsyncClient) -> dict[str, Any]:
    """Resolve restaurant_campaign_brief from prior milestones; build injected markdown."""
    del client
    _trace(state, "execute_skill", skill_id="format_mix")
    prior = str(state.get("prior_milestones_data") or "")
    brief = extract_restaurant_campaign_brief_data(prior)
    if brief is None:
        raise ValueError("format_mix requires a prior restaurant_campaign_brief milestone")
    injected, _matched = build_injected_prior_context_markdown(prior, ("restaurant_campaign_brief",))
    return {
        "campaign_brief_data": brief,
        "injected_prior_context_markdown": injected,
    }


async def persist_stub(state: FormatMixState, *, client: httpx.AsyncClient) -> dict[str, Any]:
    """Validate and persist minimal format-mix payload (empty formats until LLM step)."""
    payload: dict[str, Any] = {"formats": []}
    normalized, error = validate_skill_output("format_mix", payload)
    if error is not None or normalized is None:
        raise ValueError(error or "format_mix output validation failed")

    await upsert_milestonedata_node(
        str(state["milestone_id"]),
        int(state["location_id"]),
        normalized,
        str(state["user_id"]),
        client=client,
    )
    result_data = json.dumps(normalized, ensure_ascii=False, indent=2)
    return {
        "result_data": result_data,
        "milestone_data": normalized,
        "milestonedata_written": True,
        "raw_data": result_data,
    }
