"""Nodes for IG Menu Picker prior-plan read, analytics fetch, LLM pick, and persistence."""

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
from agents_app.agents.core.milestone_run.ig_menu_picker.prompts import (
    build_ig_menu_picker_messages,
    empty_menu_picker_retry_message,
    format_ig_menu_picker_user_message,
)
from agents_app.agents.core.milestone_run.ig_menu_picker.state import (
    IgMenuPickerOutput,
    IgMenuPickerState,
)
from agents_app.agents.core.milestone_run.llm_from_run_config import (
    structured_ainvoke_from_run_config,
)
from agents_app.agents.core.milestone_run.output_schema import validate_skill_output
from agents_app.agents.core.milestone_run.prior_context_inject import (
    extract_ig_plan_data,
    extract_ig_plan_row,
    ig_plan_prior_error_message,
)
from langgraph.config import get_stream_writer
from pydantic import BaseModel, Field

IG_MENU_PICKER_MAX_ATTEMPTS = 2
IG_MENU_PICKER_NONE_SELECTED_SENTINEL = "__no_slots_selected__"


def _trace(state: IgMenuPickerState, step: str, **extra: Any) -> None:
    payload: dict[str, Any] = {"step": step, **extra}
    run_id = state.get("run_id")
    if isinstance(run_id, str) and run_id:
        payload["run_id"] = run_id
    get_stream_writer()(payload)


def _trace_agent_event(state: IgMenuPickerState, kind: str, **extra: Any) -> None:
    payload: dict[str, Any] = {"agent_event": {"kind": kind, **extra}}
    run_id = state.get("run_id")
    if isinstance(run_id, str) and run_id:
        payload["run_id"] = run_id
    get_stream_writer()(payload)


def _fmt_owner_notes(state: IgMenuPickerState) -> str:
    raw = state.get("milestone_input")
    if not isinstance(raw, dict):
        return ""
    if raw.get("type") != "ig_menu_picker":
        return ""
    value = raw.get("value")
    if not isinstance(value, dict):
        return ""
    notes = value.get("notes")
    if not isinstance(notes, str):
        return ""
    return notes.strip()


def _read_selected_slot_keys(state: IgMenuPickerState) -> set[str] | None:
    """Return explicit selection set, or ``None`` when empty means all entries."""
    raw = state.get("milestone_input")
    if not isinstance(raw, dict) or raw.get("type") != "ig_menu_picker":
        return None
    value = raw.get("value")
    if not isinstance(value, dict):
        return None
    keys_raw = value.get("selectedSlotKeys")
    if not isinstance(keys_raw, list):
        return None
    keys = {str(k).strip() for k in keys_raw if str(k).strip()}
    keys.discard(IG_MENU_PICKER_NONE_SELECTED_SENTINEL)
    return keys if keys else None


def _slot_cell_key(day: str, meal_period: str) -> str:
    return f"{day.strip().lower()}-{meal_period.strip().lower()}"


def _trim_matrix_for_prompt(matrix: dict[str, Any]) -> dict[str, Any]:
    items = matrix.get("items")
    trimmed_items: list[dict[str, Any]] = []
    if isinstance(items, list):
        for raw in items[:40]:
            if not isinstance(raw, dict):
                continue
            menu = str(raw.get("menu") or "").strip()
            category = str(raw.get("category") or "").strip()
            if menu and category:
                trimmed_items.append({"menu": menu, "category": category})
    return {
        "thresholds": matrix.get("thresholds"),
        "distribution": matrix.get("distribution"),
        "items": trimmed_items,
    }


def _index_slot_candidates(slot_menu_candidates: dict[str, Any]) -> dict[str, dict[str, Any]]:
    indexed: dict[str, dict[str, Any]] = {}
    slots = slot_menu_candidates.get("slots")
    if not isinstance(slots, list):
        return indexed
    for cell in slots:
        if not isinstance(cell, dict):
            continue
        day = str(cell.get("day") or "").strip()
        meal_period = str(cell.get("mealPeriod") or "").strip()
        if not day or not meal_period:
            continue
        key = _slot_cell_key(day, meal_period)
        candidates = cell.get("candidates")
        trimmed_candidates: list[dict[str, Any]] = []
        if isinstance(candidates, list):
            for raw in candidates[:12]:
                if not isinstance(raw, dict):
                    continue
                menu = str(raw.get("menu") or "").strip()
                if not menu:
                    continue
                trimmed_candidates.append(
                    {
                        "menu": menu,
                        "globalCategory": raw.get("globalCategory"),
                        "recommendedUse": raw.get("recommendedUse"),
                        "rank": raw.get("rank"),
                        "score": raw.get("score"),
                    }
                )
        indexed[key] = {
            "day": day,
            "mealPeriod": meal_period,
            "insufficientData": bool(cell.get("insufficientData")),
            "candidates": trimmed_candidates,
        }
    return indexed


def _filter_plan_entries(
    plan_entries: list[dict[str, Any]],
    selected_keys: set[str] | None,
) -> list[dict[str, Any]]:
    filtered: list[dict[str, Any]] = []
    for raw in plan_entries:
        if not isinstance(raw, dict):
            continue
        slot_key = str(raw.get("slotKey") or "").strip()
        if not slot_key:
            continue
        if selected_keys is not None and slot_key not in selected_keys:
            continue
        filtered.append(raw)
    return sort_ig_plan_entries(filtered)


def _build_entry_contexts(
    *,
    plan_entries: list[dict[str, Any]],
    slot_index: dict[str, dict[str, Any]],
    matrix: dict[str, Any],
) -> list[dict[str, Any]]:
    matrix_items = matrix.get("items")
    matrix_by_role: dict[str, list[str]] = {}
    if isinstance(matrix_items, list):
        for raw in matrix_items:
            if not isinstance(raw, dict):
                continue
            menu = str(raw.get("menu") or "").strip()
            category = str(raw.get("category") or "").strip().lower()
            if menu and category:
                matrix_by_role.setdefault(category, []).append(menu)

    contexts: list[dict[str, Any]] = []
    for entry in plan_entries:
        slot_key = str(entry.get("slotKey") or "").strip()
        product_role = str(entry.get("productRole") or "").strip().lower()
        slot_cell = slot_index.get(slot_key, {})
        candidates = slot_cell.get("candidates")
        candidate_menus = (
            [str(c.get("menu") or "").strip() for c in candidates if isinstance(c, dict)]
            if isinstance(candidates, list)
            else []
        )
        candidate_menus = [m for m in candidate_menus if m]
        fallback_menus = matrix_by_role.get(product_role, [])[:8]
        contexts.append(
            {
                "planEntry": entry,
                "slotCandidates": candidate_menus,
                "matrixFallbackMenus": fallback_menus,
                "insufficientSlotData": bool(slot_cell.get("insufficientData"))
                and len(candidate_menus) < 3,
            }
        )
    return contexts


def _normalize_generated_output(payload: Any) -> IgMenuPickerOutput:
    if not isinstance(payload, dict):
        raise ValueError("ig_menu_picker output validation failed")
    entries = payload.get("entries")
    if isinstance(entries, list):
        payload = {
            **payload,
            "entries": sort_ig_plan_entries([row for row in entries if isinstance(row, dict)]),
        }
    normalized, error = validate_skill_output("ig_menu_picker", payload)
    if error is not None or not isinstance(normalized, dict):
        raise ValueError(error or "ig_menu_picker output validation failed")
    return normalized  # type: ignore[return-value]


class IgMenuPickerMenuItemDraft(BaseModel):
    menu: str = Field(min_length=1)
    rationale: str = ""


class IgMenuPickerEntryPickDraft(BaseModel):
    slotKey: str = Field(min_length=1)
    menuItems: list[IgMenuPickerMenuItemDraft] = Field(min_length=1, max_length=3)


class IgMenuPickerPickOutput(BaseModel):
    entries: list[IgMenuPickerEntryPickDraft] = Field(min_length=1)


def _merge_plan_with_picks(
    *,
    plan_entries: list[dict[str, Any]],
    picks: IgMenuPickerPickOutput,
) -> list[dict[str, Any]]:
    plan_by_key = {
        str(entry.get("slotKey") or "").strip(): entry
        for entry in plan_entries
        if str(entry.get("slotKey") or "").strip()
    }
    merged: list[dict[str, Any]] = []
    for pick in picks.entries:
        slot_key = pick.slotKey.strip()
        plan_entry = plan_by_key.get(slot_key)
        if plan_entry is None:
            raise ValueError(f"ig_menu_picker LLM returned unknown slotKey: {slot_key}")
        merged.append(
            {
                **plan_entry,
                "menuItems": [item.model_dump() for item in pick.menuItems],
            }
        )
    if len(merged) != len(plan_entries):
        merged_keys = {str(row.get("slotKey") or "").strip() for row in merged}
        missing = sorted(set(plan_by_key) - merged_keys)
        if missing:
            raise ValueError(
                "ig_menu_picker LLM omitted slotKeys: " + ", ".join(missing[:5])
            )
    return sort_ig_plan_entries(merged)


async def fetch_and_prepare(state: IgMenuPickerState, *, client: httpx.AsyncClient) -> dict[str, Any]:
    _trace(state, "execute_skill", skill_id="ig_menu_picker")

    analytics_run_id = str(state.get("analytics_run_id") or "").strip()
    if not analytics_run_id:
        raise ValueError(
            "ig_menu_picker requires a workflow-pinned analytics run (analyticsRunId on the workflow)"
        )

    prior_json = str(state.get("prior_milestones_data") or "")
    prior_row = extract_ig_plan_row(prior_json)
    prior_data = extract_ig_plan_data(prior_json)
    if prior_data is None:
        raise ValueError(ig_plan_prior_error_message(prior_json))

    plan_entries_raw = prior_data.get("entries")
    if not isinstance(plan_entries_raw, list):
        raise ValueError(ig_plan_prior_error_message(prior_json))

    selected_keys = _read_selected_slot_keys(state)
    selected_entries = _filter_plan_entries(
        [row for row in plan_entries_raw if isinstance(row, dict)],
        selected_keys,
    )
    if not selected_entries:
        raise ValueError("ig_menu_picker requires at least one selected IG Plan entry")

    fetched = await fetch_ig_plan_inputs(
        int(state["location_id"]),
        str(state["user_id"]),
        client=client,
        analytics_run_id=analytics_run_id,
    )
    slot_candidates = fetched["slotMenuCandidates"]
    menu_matrix = fetched["menuEngineeringMatrix"]
    if not isinstance(slot_candidates, dict):
        raise ValueError("ig_menu_picker requires slot menu candidates")

    reporting_period = str(slot_candidates.get("reportingPeriod") or "").strip()
    if not reporting_period:
        raise ValueError("ig_menu_picker requires reportingPeriod from slot menu candidates")

    slot_index = _index_slot_candidates(slot_candidates)
    entry_contexts = _build_entry_contexts(
        plan_entries=selected_entries,
        slot_index=slot_index,
        matrix=menu_matrix if isinstance(menu_matrix, dict) else {},
    )
    owner_notes = _fmt_owner_notes(state)
    goal = str(state.get("goal") or "")
    context_payload = {
        "goal": goal.strip() or None,
        "ownerNotes": owner_notes or None,
        "scheduleExplanation": str(prior_data.get("scheduleExplanation") or "").strip() or None,
        "entries": entry_contexts,
        "menuEngineeringMatrix": _trim_matrix_for_prompt(
            menu_matrix if isinstance(menu_matrix, dict) else {}
        ),
    }
    generation_context_json = format_ig_menu_picker_user_message(
        goal=goal,
        owner_notes=owner_notes,
        context_payload=context_payload,
    )

    return {
        "prior_ig_plan_row": prior_row or {},
        "prior_ig_plan_data": prior_data,
        "selected_plan_entries": selected_entries,
        "analytics_run_id": fetched["analyticsRunId"],
        "menu_engineering_matrix": menu_matrix,
        "slot_menu_candidates": slot_candidates,
        "generation_context_json": generation_context_json,
    }


async def pick_menu_items_with_llm(state: IgMenuPickerState) -> dict[str, Any]:
    selected_entries = state.get("selected_plan_entries")
    if not isinstance(selected_entries, list) or not selected_entries:
        raise ValueError("ig_menu_picker requires selected IG Plan entries")

    prior_data = state.get("prior_ig_plan_data")
    if not isinstance(prior_data, dict):
        raise ValueError("ig_menu_picker requires prior IG Plan data")

    analytics_run_id = str(state.get("analytics_run_id") or "").strip()
    if not analytics_run_id:
        raise ValueError("ig_menu_picker requires analytics run id")

    slot_candidates = state.get("slot_menu_candidates")
    if not isinstance(slot_candidates, dict):
        raise ValueError("ig_menu_picker requires slot menu candidates")

    reporting_period = str(slot_candidates.get("reportingPeriod") or "").strip()
    schedule_explanation = str(prior_data.get("scheduleExplanation") or "").strip()
    if not schedule_explanation:
        raise ValueError("ig_menu_picker requires scheduleExplanation from prior IG Plan")
    if not reporting_period:
        raise ValueError("ig_menu_picker requires reportingPeriod from slot menu candidates")

    goal = str(state.get("goal") or "")
    owner_notes = _fmt_owner_notes(state)
    menu_matrix = state.get("menu_engineering_matrix")
    if not isinstance(menu_matrix, dict):
        menu_matrix = {}
    slot_index = _index_slot_candidates(slot_candidates)
    context_payload = {
        "goal": goal.strip() or None,
        "ownerNotes": owner_notes or None,
        "scheduleExplanation": schedule_explanation,
        "entries": _build_entry_contexts(
            plan_entries=selected_entries,
            slot_index=slot_index,
            matrix=menu_matrix,
        ),
        "menuEngineeringMatrix": _trim_matrix_for_prompt(menu_matrix),
    }
    messages = build_ig_menu_picker_messages(
        goal=goal,
        owner_notes=owner_notes,
        context_payload=context_payload,
    )

    _trace(state, "pick_menu_items_with_llm")
    _trace_agent_event(state, "chat_model_start")

    last_error: Exception | None = None
    picks: IgMenuPickerPickOutput | None = None
    for attempt in range(1, IG_MENU_PICKER_MAX_ATTEMPTS + 1):
        try:
            generated = await structured_ainvoke_from_run_config(IgMenuPickerPickOutput, messages)
        except LLMInvokeError as exc:
            emit_llm_error_step(exc.code, str(exc))
            raise ValueError(str(exc)) from exc
        if generated.entries:
            picks = generated
            break
        last_error = ValueError("ig_menu_picker returned empty structured output")
        if attempt < IG_MENU_PICKER_MAX_ATTEMPTS:
            messages = [*messages, empty_menu_picker_retry_message()]
    if picks is None:
        raise last_error or ValueError("ig_menu_picker returned empty structured output")

    merged_entries = _merge_plan_with_picks(plan_entries=selected_entries, picks=picks)
    prior_row = state.get("prior_ig_plan_row")
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
        payload["sourceIgPlanTitle"] = source_title

    normalized = _normalize_generated_output(payload)
    _trace_agent_event(state, "chat_model_end")
    return {"generated_output": normalized}


def _build_eval_hints(state: IgMenuPickerState, payload: dict[str, Any]) -> dict[str, Any]:
    prior_data = state.get("prior_ig_plan_data")
    all_plan_keys: list[str] = []
    if isinstance(prior_data, dict):
        for row in prior_data.get("entries") or []:
            if isinstance(row, dict):
                key = str(row.get("slotKey") or "").strip()
                if key:
                    all_plan_keys.append(key)

    selected_keys = _read_selected_slot_keys(state)
    empty_means_all = selected_keys is None
    expected = list(all_plan_keys) if empty_means_all else sorted(selected_keys)

    entries = payload.get("entries")
    output_keys: list[str] = []
    if isinstance(entries, list):
        output_keys = [
            str(entry.get("slotKey") or "").strip()
            for entry in entries
            if isinstance(entry, dict) and str(entry.get("slotKey") or "").strip()
        ]

    has_prior = isinstance(prior_data, dict) and len(all_plan_keys) > 0
    return {
        "hasPriorIgPlan": has_prior,
        "priorIgPlanEntryCount": len(all_plan_keys),
        "emptySelectionMeansAll": empty_means_all,
        "selectedSlotKeys": sorted(selected_keys) if selected_keys else [],
        "igPlanSlotKeys": all_plan_keys,
        "expectedOutputSlotKeys": expected,
        "outputSlotKeys": output_keys,
    }


async def persist_result(state: IgMenuPickerState, *, client: httpx.AsyncClient) -> dict[str, Any]:
    payload = _normalize_generated_output(state.get("generated_output"))
    selected_keys = _read_selected_slot_keys(state)
    if selected_keys is not None:
        entries = payload.get("entries")
        if isinstance(entries, list):
            payload = {
                **payload,
                "entries": [
                    row
                    for row in entries
                    if isinstance(row, dict)
                    and str(row.get("slotKey") or "").strip() in selected_keys
                ],
            }
            payload = _normalize_generated_output(payload)
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
    result_data = f"Attached menu items to {entry_count} IG Plan slot(s)."
    eval_raw_data = json.dumps(eval_payload, ensure_ascii=False, indent=2)
    return {
        "result_data": result_data,
        "milestone_data": eval_payload,
        "milestonedata_written": True,
        "raw_data": eval_raw_data,
    }
