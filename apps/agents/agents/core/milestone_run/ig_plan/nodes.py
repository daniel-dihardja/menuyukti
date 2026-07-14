"""Nodes for IGPlan analytics fetch, LLM schedule generation, and persistence."""

from __future__ import annotations

import json
from typing import Any

import httpx
from agents_app.agents.core.llm_invoke import LLMInvokeError, emit_llm_error_step
from agents_app.agents.core.milestone_eval.ig_plan_eval import sort_ig_plan_entries
from agents_app.agents.core.milestone_run.graphql_client import (
    fetch_ig_plan_inputs,
    upsert_milestonedata_node,
)
from agents_app.agents.core.milestone_run.ig_plan.prompts import (
    build_ig_plan_messages,
    empty_plan_retry_message,
    format_ig_plan_user_message,
)
from agents_app.agents.core.milestone_run.ig_plan.state import IgPlanOutput, IgPlanState
from agents_app.agents.core.milestone_run.llm_from_run_config import (
    structured_ainvoke_from_run_config,
)
from agents_app.agents.core.milestone_run.output_schema import validate_skill_output
from agents_app.agents.core.milestone_run.tools.get_location_profile import (
    _fmt_manual_brief_hints,
)
from langchain_core.messages import BaseMessage
from langgraph.config import get_stream_writer
from pydantic import BaseModel, Field

IG_PLAN_MAX_ATTEMPTS = 2


def _trace(state: IgPlanState, step: str, **extra: Any) -> None:
    payload: dict[str, Any] = {"step": step, **extra}
    run_id = state.get("run_id")
    if isinstance(run_id, str) and run_id:
        payload["run_id"] = run_id
    get_stream_writer()(payload)


def _trace_agent_event(state: IgPlanState, kind: str, **extra: Any) -> None:
    payload: dict[str, Any] = {"agent_event": {"kind": kind, **extra}}
    run_id = state.get("run_id")
    if isinstance(run_id, str) and run_id:
        payload["run_id"] = run_id
    get_stream_writer()(payload)


def _fmt_owner_notes(state: IgPlanState) -> str:
    raw = state.get("milestone_input")
    if not isinstance(raw, dict):
        return ""
    if raw.get("type") != "ig_plan":
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
    return text


def _trim_matrix_for_prompt(matrix: dict[str, Any]) -> dict[str, Any]:
    """Portfolio distribution only — strategy node does not select menu items."""
    return {
        "thresholds": matrix.get("thresholds"),
        "distribution": matrix.get("distribution"),
    }


def _slot_performance_has_signals(slot_performance: dict[str, Any]) -> bool:
    slots = slot_performance.get("slots")
    return isinstance(slots, list) and len(slots) > 0


def _build_location_profile_context(location_raw: dict[str, Any]) -> dict[str, Any]:
    """Structured location profile from the location page (identity + owner quick profile)."""
    identity: dict[str, str] = {}
    for key in ("name", "street", "city", "country", "currency"):
        text = str(location_raw.get(key) or "").strip()
        if text:
            identity[key] = text

    manual_md = _fmt_manual_brief_hints(location_raw)
    context: dict[str, Any] = {}
    if identity:
        context["identity"] = identity
    opening_hours = location_raw.get("openingHours")
    if isinstance(opening_hours, list) and opening_hours:
        context["openingHours"] = opening_hours
    if manual_md:
        context["ownerProfileMarkdown"] = manual_md
    return context


def _build_context_payload(
    *,
    goal: str,
    owner_notes: str,
    location_profile: dict[str, Any],
    slot_performance: dict[str, Any],
    menu_engineering_matrix: dict[str, Any],
) -> dict[str, Any]:
    return {
        "goal": goal.strip() or None,
        "ownerNotes": owner_notes or None,
        "locationProfile": location_profile or None,
        "slotPerformance": slot_performance,
        "menuEngineeringMatrix": _trim_matrix_for_prompt(menu_engineering_matrix),
    }


def _build_eval_hints(
    *,
    payload: dict[str, Any],
    location_profile: dict[str, Any],
    slot_performance: dict[str, Any],
) -> dict[str, Any]:
    opening_hours = location_profile.get("openingHours")
    hours = opening_hours if isinstance(opening_hours, list) else []

    demand_by_key: dict[str, str] = {}
    slots = slot_performance.get("slots")
    if isinstance(slots, list):
        for cell in slots:
            if not isinstance(cell, dict):
                continue
            day = str(cell.get("day") or "").strip().lower()
            meal_period = str(cell.get("mealPeriod") or "").strip().lower()
            if not day or not meal_period:
                continue
            relative = str(cell.get("relativeDemand") or "").strip().lower()
            if relative in {"low", "average", "high"}:
                demand_by_key[f"{day}-{meal_period}"] = relative

    entries = payload.get("entries")
    entry_count = len(entries) if isinstance(entries, list) else 0
    return {
        "entryCount": entry_count,
        "openingHours": hours,
        "slotDemandByKey": demand_by_key,
    }


def _normalize_generated_output(payload: Any) -> IgPlanOutput:
    if not isinstance(payload, dict):
        raise ValueError("ig_plan output validation failed")
    entries = payload.get("entries")
    if isinstance(entries, list):
        payload = {
            **payload,
            "entries": sort_ig_plan_entries([row for row in entries if isinstance(row, dict)]),
        }
    normalized, error = validate_skill_output("ig_plan", payload)
    if error is not None or not isinstance(normalized, dict):
        raise ValueError(error or "ig_plan output validation failed")
    return normalized  # type: ignore[return-value]


class IgPlanEntryDraft(BaseModel):
    day: str
    slot: str
    objective: str
    pillar: str
    mealPeriod: str
    productRole: str
    slotStrategy: str
    slotKey: str


class IgPlanDraftOutput(BaseModel):
    scheduleExplanation: str = Field(min_length=1)
    entries: list[IgPlanEntryDraft] = Field(min_length=1)


async def _invoke_ig_plan_structured(messages: list[BaseMessage]) -> IgPlanDraftOutput:
    last_error: Exception | None = None
    for attempt in range(1, IG_PLAN_MAX_ATTEMPTS + 1):
        try:
            generated = await structured_ainvoke_from_run_config(IgPlanDraftOutput, messages)
        except LLMInvokeError as exc:
            emit_llm_error_step(exc.code, str(exc))
            raise ValueError(str(exc)) from exc
        if generated.entries and generated.scheduleExplanation.strip():
            return generated
        last_error = ValueError("ig_plan planning returned empty structured output")
        if attempt < IG_PLAN_MAX_ATTEMPTS:
            messages = [*messages, empty_plan_retry_message()]
    raise last_error or ValueError("ig_plan planning returned empty structured output")


async def fetch_and_prepare(state: IgPlanState, *, client: httpx.AsyncClient) -> dict[str, Any]:
    _trace(state, "execute_skill", skill_id="ig_plan")
    fetched = await fetch_ig_plan_inputs(
        int(state["location_id"]),
        str(state["user_id"]),
        client=client,
    )
    location_raw = fetched["locationRaw"]
    slot_performance = fetched["slotPerformance"]
    menu_matrix = fetched["menuEngineeringMatrix"]
    slot_candidates = fetched["slotMenuCandidates"]
    if not _slot_performance_has_signals(slot_performance):
        raise ValueError("ig_plan requires venue slot strength signals in slotPerformance")

    location_profile = _build_location_profile_context(location_raw)
    owner_notes = _fmt_owner_notes(state)
    goal = str(state.get("goal") or "")
    context_payload = _build_context_payload(
        goal=goal,
        owner_notes=owner_notes,
        location_profile=location_profile,
        slot_performance=slot_performance,
        menu_engineering_matrix=menu_matrix,
    )
    generation_context_json = format_ig_plan_user_message(
        goal=goal,
        owner_notes=owner_notes,
        context_payload=context_payload,
    )
    return {
        "location_raw": location_raw,
        "location_profile": location_profile,
        "analytics_run_id": fetched["analyticsRunId"],
        "slot_performance": slot_performance,
        "menu_engineering_matrix": menu_matrix,
        "slot_menu_candidates": slot_candidates,
        "generation_context_json": generation_context_json,
    }


async def generate_plan_with_llm(state: IgPlanState) -> dict[str, Any]:
    slot_candidates = state.get("slot_menu_candidates")
    if not isinstance(slot_candidates, dict):
        raise ValueError("ig_plan requires slot menu candidates")

    analytics_run_id = str(state.get("analytics_run_id") or "").strip()
    if not analytics_run_id:
        raise ValueError("ig_plan requires analytics run id")

    reporting_period = str(slot_candidates.get("reportingPeriod") or "").strip()
    if not reporting_period:
        raise ValueError("ig_plan requires reportingPeriod from slot menu candidates")

    location_profile = state.get("location_profile")
    if not isinstance(location_profile, dict):
        location_profile = {}
    slot_performance = state.get("slot_performance")
    if not isinstance(slot_performance, dict):
        slot_performance = {}
    menu_matrix = state.get("menu_engineering_matrix")
    if not isinstance(menu_matrix, dict):
        menu_matrix = {}

    goal = str(state.get("goal") or "")
    owner_notes = _fmt_owner_notes(state)
    context_payload = _build_context_payload(
        goal=goal,
        owner_notes=owner_notes,
        location_profile=location_profile,
        slot_performance=slot_performance,
        menu_engineering_matrix=menu_matrix,
    )
    messages = build_ig_plan_messages(
        goal=goal,
        owner_notes=owner_notes,
        context_payload=context_payload,
    )

    _trace(state, "generate_plan_with_llm")
    _trace_agent_event(state, "chat_model_start")
    generated = await _invoke_ig_plan_structured(messages)
    payload: dict[str, Any] = {
        **generated.model_dump(),
        "sourceAnalyticsRunId": analytics_run_id,
        "reportingPeriod": reporting_period,
    }
    normalized = _normalize_generated_output(payload)
    _trace_agent_event(state, "chat_model_end")
    return {"generated_output": normalized}


async def persist_result(state: IgPlanState, *, client: httpx.AsyncClient) -> dict[str, Any]:
    payload = _normalize_generated_output(state.get("generated_output"))
    location_profile = state.get("location_profile")
    if not isinstance(location_profile, dict):
        location_profile = {}
    slot_performance = state.get("slot_performance")
    if not isinstance(slot_performance, dict):
        slot_performance = {}

    await upsert_milestonedata_node(
        str(state["milestone_id"]),
        int(state["location_id"]),
        payload,
        str(state["user_id"]),
        client=client,
    )
    schedule_explanation = str(payload.get("scheduleExplanation") or "").strip()
    entries = payload.get("entries")
    entry_count = len(entries) if isinstance(entries, list) else 0
    result_data = f"{schedule_explanation}\n\n{entry_count} weekly slot entries."
    eval_payload = {
        **payload,
        "_evalHints": _build_eval_hints(
            payload=payload,
            location_profile=location_profile,
            slot_performance=slot_performance,
        ),
    }
    eval_raw_data = json.dumps(eval_payload, ensure_ascii=False, indent=2)
    return {
        "result_data": result_data,
        "milestone_data": payload,
        "milestonedata_written": True,
        "raw_data": eval_raw_data,
    }
