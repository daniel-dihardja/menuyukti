"""Nodes for IGPlan analytics fetch, LLM schedule generation, and persistence."""

from __future__ import annotations

from typing import Any

import httpx
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
from agents_app.agents.core.milestone_run.llm_from_run_config import astream_collect_from_run_config
from agents_app.agents.core.milestone_run.output_schema import validate_skill_output
from agents_app.agents.core.milestone_run.tools.get_location_profile import (
    _fmt_manual_brief_hints,
)
from langchain_core.messages import BaseMessage
from langgraph.config import get_stream_writer

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


def _collect_allowed_menu_names(
    *,
    slot_menu_candidates: dict[str, Any],
    menu_engineering_matrix: dict[str, Any],
) -> set[str]:
    names: set[str] = set()
    slots = slot_menu_candidates.get("slots")
    if isinstance(slots, list):
        for cell in slots:
            if not isinstance(cell, dict):
                continue
            candidates = cell.get("candidates")
            if not isinstance(candidates, list):
                continue
            for item in candidates:
                if not isinstance(item, dict):
                    continue
                menu = str(item.get("menu") or "").strip()
                if menu:
                    names.add(menu)
    items = menu_engineering_matrix.get("items")
    if isinstance(items, list):
        for item in items:
            if not isinstance(item, dict):
                continue
            menu = str(item.get("menu") or "").strip()
            if menu:
                names.add(menu)
    return names


def _trim_matrix_for_prompt(matrix: dict[str, Any], *, per_category: int = 8) -> dict[str, Any]:
    items = matrix.get("items")
    if not isinstance(items, list):
        return matrix
    by_category: dict[str, list[dict[str, Any]]] = {
        "star": [],
        "plow_horse": [],
        "puzzle": [],
    }
    for item in items:
        if not isinstance(item, dict):
            continue
        category = str(item.get("category") or "").strip()
        if category not in by_category:
            continue
        if len(by_category[category]) >= per_category:
            continue
        by_category[category].append(
            {
                "menu": item.get("menu"),
                "category": category,
                "action": item.get("action"),
                "quantity": item.get("quantity"),
                "contributionMargin": item.get("contributionMargin"),
                "weValue": item.get("weValue"),
                "menuCategory": item.get("menuCategory"),
            }
        )
    trimmed_items = by_category["star"] + by_category["plow_horse"] + by_category["puzzle"]
    return {
        "thresholds": matrix.get("thresholds"),
        "distribution": matrix.get("distribution"),
        "items": trimmed_items,
    }


def _trim_slot_candidates_for_prompt(candidates: dict[str, Any]) -> dict[str, Any]:
    slots = candidates.get("slots")
    if not isinstance(slots, list):
        return candidates
    trimmed_slots: list[dict[str, Any]] = []
    for cell in slots:
        if not isinstance(cell, dict):
            continue
        if cell.get("insufficientData") is True:
            continue
        raw_candidates = cell.get("candidates")
        candidate_rows: list[dict[str, Any]] = []
        if isinstance(raw_candidates, list):
            for item in raw_candidates:
                if not isinstance(item, dict):
                    continue
                candidate_rows.append(
                    {
                        "menu": item.get("menu"),
                        "globalCategory": item.get("globalCategory"),
                        "recommendedUse": item.get("recommendedUse"),
                        "rank": item.get("rank"),
                        "score": item.get("score"),
                    }
                )
        if not candidate_rows:
            continue
        trimmed_slots.append(
            {
                "day": cell.get("day"),
                "mealPeriod": cell.get("mealPeriod"),
                "mealPeriodLabel": cell.get("mealPeriodLabel"),
                "mealPeriodHoursLabel": cell.get("mealPeriodHoursLabel"),
                "demandIndex": cell.get("demandIndex"),
                "relativeDemand": cell.get("relativeDemand"),
                "posture": cell.get("posture"),
                "recommendedCategories": cell.get("recommendedCategories"),
                "candidates": candidate_rows,
            }
        )
    return {
        "reportingPeriod": candidates.get("reportingPeriod"),
        "matrixAvailable": candidates.get("matrixAvailable"),
        "coverageNotes": candidates.get("coverageNotes"),
        "slots": trimmed_slots,
    }


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
    slot_menu_candidates: dict[str, Any],
) -> dict[str, Any]:
    return {
        "goal": goal.strip() or None,
        "ownerNotes": owner_notes or None,
        "locationProfile": location_profile or None,
        "slotPerformance": slot_performance,
        "menuEngineeringMatrix": _trim_matrix_for_prompt(menu_engineering_matrix),
        "slotMenuCandidates": _trim_slot_candidates_for_prompt(slot_menu_candidates),
    }


def _normalize_generated_output(payload: Any) -> IgPlanOutput:
    if not isinstance(payload, dict):
        raise ValueError("ig_plan output validation failed")
    normalized, error = validate_skill_output("ig_plan", payload)
    if error is not None or not isinstance(normalized, dict):
        raise ValueError(error or "ig_plan output validation failed")
    return normalized  # type: ignore[return-value]


async def _invoke_ig_plan_markdown(messages: list[BaseMessage]) -> str:
    for attempt in range(1, IG_PLAN_MAX_ATTEMPTS + 1):
        text = (await astream_collect_from_run_config(messages)).strip()
        if text:
            return text
        if attempt < IG_PLAN_MAX_ATTEMPTS:
            messages = [*messages, empty_plan_retry_message()]
    raise ValueError("ig_plan planning returned empty markdown")


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
    allowed_menu_names = _collect_allowed_menu_names(
        slot_menu_candidates=slot_candidates,
        menu_engineering_matrix=menu_matrix,
    )
    if not allowed_menu_names:
        raise ValueError("ig_plan requires at least one promotable menu item in analytics data")

    location_profile = _build_location_profile_context(location_raw)
    owner_notes = _fmt_owner_notes(state)
    goal = str(state.get("goal") or "")
    context_payload = _build_context_payload(
        goal=goal,
        owner_notes=owner_notes,
        location_profile=location_profile,
        slot_performance=slot_performance,
        menu_engineering_matrix=menu_matrix,
        slot_menu_candidates=slot_candidates,
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
        "allowed_menu_names": allowed_menu_names,
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
        slot_menu_candidates=slot_candidates,
    )
    messages = build_ig_plan_messages(
        goal=goal,
        owner_notes=owner_notes,
        context_payload=context_payload,
    )

    _trace(state, "generate_plan_with_llm")
    _trace_agent_event(state, "chat_model_start")
    plan_markdown = await _invoke_ig_plan_markdown(messages)
    payload: dict[str, Any] = {
        "planMarkdown": plan_markdown,
        "sourceAnalyticsRunId": analytics_run_id,
        "reportingPeriod": reporting_period,
    }
    normalized = _normalize_generated_output(payload)
    _trace_agent_event(state, "chat_model_end")
    return {"generated_output": normalized}


async def persist_result(state: IgPlanState, *, client: httpx.AsyncClient) -> dict[str, Any]:
    payload = _normalize_generated_output(state.get("generated_output"))
    await upsert_milestonedata_node(
        str(state["milestone_id"]),
        int(state["location_id"]),
        payload,
        str(state["user_id"]),
        client=client,
    )
    plan_markdown = str(payload.get("planMarkdown") or "").strip()
    return {
        "result_data": plan_markdown,
        "milestone_data": payload,
        "milestonedata_written": True,
        "raw_data": plan_markdown,
    }
