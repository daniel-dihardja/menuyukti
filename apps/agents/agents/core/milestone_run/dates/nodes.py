"""Nodes for dedicated dates fetch and persistence."""

from __future__ import annotations

import json
from typing import Any

import httpx
from agents_app.agents.core.milestone_run.dates.state import DatesState
from agents_app.agents.core.milestone_run.graphql_client import (
    fetch_public_holidays_for_milestone,
    upsert_milestonedata_node,
)
from agents_app.agents.core.milestone_run.output_schema import validate_skill_output
from langgraph.config import get_stream_writer


def _trace(state: DatesState, step: str, **extra: Any) -> None:
    payload: dict[str, Any] = {"step": step, **extra}
    run_id = state.get("run_id")
    if isinstance(run_id, str) and run_id:
        payload["run_id"] = run_id
    get_stream_writer()(payload)


def _extract_window(milestone_input: dict[str, Any] | None) -> tuple[str, str]:
    if not isinstance(milestone_input, dict):
        raise ValueError("dates milestone_input is required")
    value = milestone_input.get("value")
    if not isinstance(value, dict):
        raise ValueError("dates milestone_input.value is required")
    start_date = str(value.get("startDate") or "").strip()
    end_date = str(value.get("endDate") or "").strip()
    if not start_date or not end_date:
        raise ValueError("dates requires startDate and endDate in milestone_input.value")
    return start_date, end_date


async def fetch_dates_context(state: DatesState, *, client: httpx.AsyncClient) -> dict[str, Any]:
    """Resolve campaign window and public holidays without any LLM step."""
    _trace(state, "execute_skill", skill_id="dates")
    start_date, end_date = _extract_window(state.get("milestone_input"))
    public_holidays, holidays_error = await fetch_public_holidays_for_milestone(
        int(state["location_id"]),
        start_date,
        end_date,
        str(state["user_id"]),
        client=client,
    )
    if holidays_error:
        raise ValueError(holidays_error)
    return {
        "start_date": start_date,
        "end_date": end_date,
        "public_holidays": public_holidays,
    }


async def persist_result(state: DatesState, *, client: httpx.AsyncClient) -> dict[str, Any]:
    """Validate and persist dates payload via milestone data upsert."""
    payload = {
        "startDate": str(state.get("start_date", "")).strip(),
        "endDate": str(state.get("end_date", "")).strip(),
        "publicHolidays": state.get("public_holidays") or [],
    }
    normalized, error = validate_skill_output("dates", payload)
    if error is not None or normalized is None:
        raise ValueError(error or "dates output validation failed")

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
