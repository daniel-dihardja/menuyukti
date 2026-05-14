"""Nodes for scheduler fetch, snapshot, and persistence."""

from __future__ import annotations

import json
from typing import Any

import httpx
from agents_app.agents.core.milestone_run.graphql_client import upsert_milestonedata_node
from agents_app.agents.core.milestone_run.output_schema import validate_skill_output
from agents_app.agents.core.milestone_run.prior_context_inject import (
    dates_prior_error_message,
    extract_dates_data,
    extract_dates_row,
)
from agents_app.agents.core.milestone_run.scheduler.state import SchedulerOutput, SchedulerState
from langgraph.config import get_stream_writer


def _trace(state: SchedulerState, step: str, **extra: Any) -> None:
    payload: dict[str, Any] = {"step": step, **extra}
    run_id = state.get("run_id")
    if isinstance(run_id, str) and run_id:
        payload["run_id"] = run_id
    get_stream_writer()(payload)


def _normalize_generated_output(payload: Any) -> SchedulerOutput:
    if not isinstance(payload, dict):
        raise ValueError("scheduler output validation failed")
    normalized, error = validate_skill_output("scheduler", payload)
    if error is not None or not isinstance(normalized, dict):
        raise ValueError(error or "scheduler output validation failed")
    return normalized  # type: ignore[return-value]


async def fetch_and_prepare(state: SchedulerState, *, client: httpx.AsyncClient) -> dict[str, Any]:
    del client
    _trace(state, "execute_skill", skill_id="scheduler")

    prior_json = str(state.get("prior_milestones_data") or "")
    dates_data = extract_dates_data(prior_json)
    if dates_data is None:
        raise ValueError(dates_prior_error_message(prior_json))

    dates_row = extract_dates_row(prior_json)
    source_title = ""
    if isinstance(dates_row, dict):
        title = dates_row.get("title")
        if isinstance(title, str) and title.strip():
            source_title = title.strip()

    return {
        "dates_data": dates_data,
        "source_dates_title": source_title,
    }


async def build_snapshot(state: SchedulerState) -> dict[str, Any]:
    dates_data = state.get("dates_data")
    if not isinstance(dates_data, dict):
        raise ValueError("scheduler requires prior dates milestone data")

    start_date = str(dates_data.get("startDate") or "").strip()
    end_date = str(dates_data.get("endDate") or "").strip()
    if not start_date or not end_date:
        raise ValueError("scheduler requires prior dates milestone with startDate and endDate")

    public_holidays = dates_data.get("publicHolidays")
    if not isinstance(public_holidays, list):
        public_holidays = []

    payload: dict[str, Any] = {
        "startDate": start_date,
        "endDate": end_date,
        "publicHolidays": public_holidays,
        "slots": [],
    }
    source_title = str(state.get("source_dates_title") or "").strip()
    if source_title:
        payload["sourceDatesTitle"] = source_title

    normalized = _normalize_generated_output(payload)
    return {"generated_output": normalized}


async def persist_result(state: SchedulerState, *, client: httpx.AsyncClient) -> dict[str, Any]:
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
