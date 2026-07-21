"""Nodes for IG Format prior menu picker read, LLM format assignment, and persistence."""

from __future__ import annotations

import json
from typing import Any, Literal

import httpx
from agents_app.agents.core.llm_invoke import LLMInvokeError, emit_llm_error_step
from agents_app.agents.core.milestone_eval.ig_plan_eval import sort_ig_plan_entries
from agents_app.agents.core.milestone_run.graphql_client import upsert_milestonedata_node
from agents_app.agents.core.milestone_run.ig_format.prompts import (
    build_ig_format_messages,
    empty_format_retry_message,
)
from agents_app.agents.core.milestone_run.ig_format.state import IgFormatState
from agents_app.agents.core.milestone_run.ig_schedule import parse_ig_menu_picker_schedule
from agents_app.agents.core.milestone_run.llm_from_run_config import (
    structured_ainvoke_from_run_config,
)
from agents_app.agents.core.milestone_run.output_schema import validate_skill_output
from agents_app.agents.core.milestone_run.prior_context_inject import (
    extract_ig_menu_picker_data,
    extract_ig_menu_picker_row,
    ig_menu_picker_prior_error_message,
    preferred_milestone_id_from_input,
)
from langgraph.config import get_stream_writer
from pydantic import BaseModel, Field, ValidationError

IG_FORMAT_MAX_ATTEMPTS = 2
VALID_FORMAT_TYPES = frozenset({"reel", "post", "post-carousel", "story"})


def _trace(state: IgFormatState, step: str, **extra: Any) -> None:
    payload: dict[str, Any] = {"step": step, **extra}
    run_id = state.get("run_id")
    if isinstance(run_id, str) and run_id:
        payload["run_id"] = run_id
    get_stream_writer()(payload)


def _trace_agent_event(state: IgFormatState, kind: str, **extra: Any) -> None:
    payload: dict[str, Any] = {"agent_event": {"kind": kind, **extra}}
    run_id = state.get("run_id")
    if isinstance(run_id, str) and run_id:
        payload["run_id"] = run_id
    get_stream_writer()(payload)


def _fmt_owner_notes(state: IgFormatState) -> str:
    raw = state.get("milestone_input")
    if not isinstance(raw, dict):
        return ""
    if raw.get("type") != "ig_format":
        return ""
    value = raw.get("value")
    if not isinstance(value, dict):
        return ""
    notes = value.get("notes")
    if not isinstance(notes, str):
        return ""
    return notes.strip()


def _normalize_generated_output(payload: Any) -> dict[str, Any]:
    if not isinstance(payload, dict):
        raise ValueError("ig_format output validation failed")
    entries = payload.get("entries")
    if isinstance(entries, list):
        payload = {
            **payload,
            "entries": sort_ig_plan_entries([row for row in entries if isinstance(row, dict)]),
        }
    normalized, error = validate_skill_output("ig_format", payload)
    if error is not None or not isinstance(normalized, dict):
        raise ValueError(error or "ig_format output validation failed")
    return normalized


class IgFormatEntryPickDraft(BaseModel):
    slotKey: str = Field(min_length=1)
    type: Literal["reel", "post", "post-carousel", "story"]
    formatRationale: str = ""


class IgFormatPickOutput(BaseModel):
    entries: list[IgFormatEntryPickDraft] = Field(min_length=1)


def _merge_menu_picker_with_formats(
    *,
    source_entries: list[dict[str, Any]],
    picks: IgFormatPickOutput,
) -> list[dict[str, Any]]:
    source_by_key = {
        str(entry.get("slotKey") or "").strip(): entry
        for entry in source_entries
        if str(entry.get("slotKey") or "").strip()
    }
    merged: list[dict[str, Any]] = []
    for pick in picks.entries:
        slot_key = pick.slotKey.strip()
        source_entry = source_by_key.get(slot_key)
        if source_entry is None:
            raise ValueError(f"ig_format LLM returned unknown slotKey: {slot_key}")
        if pick.type not in VALID_FORMAT_TYPES:
            raise ValueError(f"ig_format LLM returned invalid type: {pick.type}")
        menu_items = source_entry.get("menuItems")
        item_count = len(menu_items) if isinstance(menu_items, list) else 0
        if pick.type == "post-carousel" and item_count < 2:
            raise ValueError(
                f"ig_format post-carousel requires 2–3 menuItems for slotKey {slot_key}"
            )
        rationale = pick.formatRationale.strip()
        if not rationale:
            raise ValueError(f"ig_format LLM returned empty formatRationale for {slot_key}")
        merged.append(
            {
                **source_entry,
                "type": pick.type,
                "formatRationale": rationale,
            }
        )
    if len(merged) != len(source_entries):
        merged_keys = {str(row.get("slotKey") or "").strip() for row in merged}
        missing = sorted(set(source_by_key) - merged_keys)
        if missing:
            raise ValueError("ig_format LLM omitted slotKeys: " + ", ".join(missing[:5]))
    return sort_ig_plan_entries(merged)


async def fetch_and_prepare(state: IgFormatState, *, client: httpx.AsyncClient) -> dict[str, Any]:
    del client  # prior-data only; no GraphQL fetch
    _trace(state, "execute_skill", skill_id="ig_format")

    prior_json = str(state.get("prior_milestones_data") or "")
    preferred = preferred_milestone_id_from_input(
        state.get("milestone_input"),
        "sourceIgMenuPickerMilestoneId",
    )
    prior_row = extract_ig_menu_picker_row(prior_json, preferred_milestone_id=preferred)
    prior_data_raw = extract_ig_menu_picker_data(prior_json, preferred_milestone_id=preferred)
    if prior_data_raw is None:
        raise ValueError(ig_menu_picker_prior_error_message(prior_json))
    try:
        menu_schedule = parse_ig_menu_picker_schedule(prior_data_raw)
    except ValidationError as exc:
        raise ValueError(ig_menu_picker_prior_error_message(prior_json)) from exc
    prior_data = menu_schedule.model_dump()

    source_entries = sort_ig_plan_entries([entry.model_dump() for entry in menu_schedule.entries])
    if not source_entries:
        raise ValueError("ig_format requires at least one IG Menu Picker entry with menuItems")

    owner_notes = _fmt_owner_notes(state)
    goal = str(state.get("goal") or "")
    schedule_explanation = str(prior_data.get("scheduleExplanation") or "").strip()
    context_payload = {
        "goal": goal.strip() or None,
        "ownerNotes": owner_notes or None,
        "scheduleExplanation": schedule_explanation or None,
        "entries": source_entries,
    }

    return {
        "prior_ig_menu_picker_row": prior_row or {},
        "prior_ig_menu_picker_data": prior_data,
        "source_menu_picker_entries": source_entries,
        "generation_context_json": json.dumps(context_payload, ensure_ascii=False, indent=2),
    }


async def assign_formats_with_llm(state: IgFormatState) -> dict[str, Any]:
    source_entries = state.get("source_menu_picker_entries")
    if not isinstance(source_entries, list) or not source_entries:
        raise ValueError("ig_format requires IG Menu Picker source entries")

    prior_data = state.get("prior_ig_menu_picker_data")
    if not isinstance(prior_data, dict):
        raise ValueError("ig_format requires prior IG Menu Picker data")

    schedule_explanation = str(prior_data.get("scheduleExplanation") or "").strip()
    if not schedule_explanation:
        raise ValueError("ig_format requires scheduleExplanation from prior IG Menu Picker")

    reporting_period = str(prior_data.get("reportingPeriod") or "").strip()
    if not reporting_period:
        raise ValueError("ig_format requires reportingPeriod from prior IG Menu Picker")

    analytics_run_id = str(prior_data.get("sourceAnalyticsRunId") or "").strip()
    if not analytics_run_id:
        raise ValueError("ig_format requires sourceAnalyticsRunId from prior IG Menu Picker")

    goal = str(state.get("goal") or "")
    owner_notes = _fmt_owner_notes(state)
    context_payload = {
        "goal": goal.strip() or None,
        "ownerNotes": owner_notes or None,
        "scheduleExplanation": schedule_explanation,
        "entries": source_entries,
    }
    messages = build_ig_format_messages(
        goal=goal,
        owner_notes=owner_notes,
        context_payload=context_payload,
    )

    _trace(state, "assign_formats_with_llm")
    _trace_agent_event(state, "chat_model_start")

    last_error: Exception | None = None
    picks: IgFormatPickOutput | None = None
    for attempt in range(1, IG_FORMAT_MAX_ATTEMPTS + 1):
        try:
            generated = await structured_ainvoke_from_run_config(IgFormatPickOutput, messages)
        except LLMInvokeError as exc:
            emit_llm_error_step(exc.code, str(exc))
            raise ValueError(str(exc)) from exc
        if generated.entries:
            picks = generated
            break
        last_error = ValueError("ig_format returned empty structured output")
        if attempt < IG_FORMAT_MAX_ATTEMPTS:
            messages = [*messages, empty_format_retry_message()]
    if picks is None:
        raise last_error or ValueError("ig_format returned empty structured output")

    merged_entries = _merge_menu_picker_with_formats(source_entries=source_entries, picks=picks)
    prior_row = state.get("prior_ig_menu_picker_row")
    source_title = ""
    if isinstance(prior_row, dict):
        source_title = str(prior_row.get("title") or "").strip()

    payload: dict[str, Any] = {
        "scheduleExplanation": schedule_explanation,
        "entries": merged_entries,
        "sourceAnalyticsRunId": analytics_run_id,
        "reportingPeriod": reporting_period,
    }
    if source_title:
        payload["sourceIgMenuPickerTitle"] = source_title

    normalized = _normalize_generated_output(payload)
    _trace_agent_event(state, "chat_model_end")
    return {"generated_output": normalized}


def _build_eval_hints(state: IgFormatState, payload: dict[str, Any]) -> dict[str, Any]:
    source_entries = state.get("source_menu_picker_entries")
    source_keys: list[str] = []
    if isinstance(source_entries, list):
        for row in source_entries:
            if isinstance(row, dict):
                key = str(row.get("slotKey") or "").strip()
                if key:
                    source_keys.append(key)

    entries = payload.get("entries")
    output_keys: list[str] = []
    if isinstance(entries, list):
        output_keys = [
            str(entry.get("slotKey") or "").strip()
            for entry in entries
            if isinstance(entry, dict) and str(entry.get("slotKey") or "").strip()
        ]

    prior_row = state.get("prior_ig_menu_picker_row")
    has_prior = isinstance(source_entries, list) and len(source_keys) > 0
    return {
        "hasPriorIgMenuPicker": has_prior,
        "priorIgMenuPickerEntryCount": len(source_keys),
        "sourceMenuPickerSlotKeys": source_keys,
        "expectedOutputSlotKeys": source_keys,
        "outputSlotKeys": output_keys,
        "priorIgMenuPickerTitle": (
            str(prior_row.get("title") or "").strip() if isinstance(prior_row, dict) else ""
        ),
    }


async def persist_result(state: IgFormatState, *, client: httpx.AsyncClient) -> dict[str, Any]:
    payload = _normalize_generated_output(state.get("generated_output"))
    eval_payload = {**payload, "_evalHints": _build_eval_hints(state, payload)}
    await upsert_milestonedata_node(
        str(state["milestone_id"]),
        int(state["location_id"]),
        eval_payload,
        str(state["user_id"]),
        client=client,
    )
    entries = payload.get("entries")
    entry_count = len(entries) if isinstance(entries, list) else 0
    result_data = f"Assigned Instagram formats to {entry_count} menu picker slot(s)."
    eval_raw_data = json.dumps(eval_payload, ensure_ascii=False, indent=2)
    return {
        "result_data": result_data,
        "milestone_data": eval_payload,
        "milestonedata_written": True,
        "raw_data": eval_raw_data,
    }
