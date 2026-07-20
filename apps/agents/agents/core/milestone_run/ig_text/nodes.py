"""Nodes for IG Text prior format read, LLM copy generation, and persistence."""

from __future__ import annotations

import json
from typing import Any

import httpx
from agents_app.agents.core.llm_invoke import LLMInvokeError, emit_llm_error_step
from agents_app.agents.core.milestone_eval.ig_plan_eval import sort_ig_plan_entries
from agents_app.agents.core.milestone_run.graphql_client import upsert_milestonedata_node
from agents_app.agents.core.milestone_run.ig_text.prompts import (
    build_ig_text_messages,
    empty_text_retry_message,
)
from agents_app.agents.core.milestone_run.ig_text.state import IgTextOutput, IgTextState
from agents_app.agents.core.milestone_run.llm_from_run_config import (
    structured_ainvoke_from_run_config,
)
from agents_app.agents.core.milestone_run.output_schema import validate_skill_output
from agents_app.agents.core.milestone_run.prior_context_inject import (
    extract_ig_format_data,
    extract_ig_format_row,
    extract_restaurant_campaign_brief_row,
    ig_format_has_entries,
    ig_format_prior_error_message,
    preferred_milestone_id_from_input,
)
from langgraph.config import get_stream_writer
from pydantic import BaseModel, Field, field_validator

IG_TEXT_MAX_ATTEMPTS = 2


def _trace(state: IgTextState, step: str, **extra: Any) -> None:
    payload: dict[str, Any] = {"step": step, **extra}
    run_id = state.get("run_id")
    if isinstance(run_id, str) and run_id:
        payload["run_id"] = run_id
    get_stream_writer()(payload)


def _trace_agent_event(state: IgTextState, kind: str, **extra: Any) -> None:
    payload: dict[str, Any] = {"agent_event": {"kind": kind, **extra}}
    run_id = state.get("run_id")
    if isinstance(run_id, str) and run_id:
        payload["run_id"] = run_id
    get_stream_writer()(payload)


def _fmt_owner_notes(state: IgTextState) -> str:
    raw = state.get("milestone_input")
    if not isinstance(raw, dict):
        return ""
    if raw.get("type") != "ig_text":
        return ""
    value = raw.get("value")
    if not isinstance(value, dict):
        return ""
    notes = value.get("notes")
    if not isinstance(notes, str):
        return ""
    return notes.strip()


def _ig_format_entries(prior_data: dict[str, Any]) -> list[dict[str, Any]]:
    raw = prior_data.get("entries")
    if not isinstance(raw, list):
        return []
    entries: list[dict[str, Any]] = []
    for row in raw:
        if not isinstance(row, dict):
            continue
        slot_key = str(row.get("slotKey") or "").strip()
        menu_items = row.get("menuItems")
        fmt_type = str(row.get("type") or "").strip()
        if not slot_key or not fmt_type or not isinstance(menu_items, list) or not menu_items:
            continue
        entries.append(row)
    return sort_ig_plan_entries(entries)


def _normalize_generated_output(payload: Any) -> IgTextOutput:
    if not isinstance(payload, dict):
        raise ValueError("ig_text output validation failed")
    entries = payload.get("entries")
    if isinstance(entries, list):
        payload = {
            **payload,
            "entries": sort_ig_plan_entries([row for row in entries if isinstance(row, dict)]),
        }
    normalized, error = validate_skill_output("ig_text", payload)
    if error is not None or not isinstance(normalized, dict):
        raise ValueError(error or "ig_text output validation failed")
    return normalized  # type: ignore[return-value]


class IgTextFieldDraft(BaseModel):
    field: str = Field(min_length=1)
    value: str = Field(min_length=1)

    @field_validator("field", "value")
    @classmethod
    def _validate_non_empty(cls, value: str) -> str:
        text = value.strip()
        if not text:
            raise ValueError("must be non-empty")
        return text


class IgTextEntryDraft(BaseModel):
    slotKey: str = Field(min_length=1)
    texts: list[IgTextFieldDraft] = Field(min_length=1)


class IgTextPickOutput(BaseModel):
    entries: list[IgTextEntryDraft] = Field(min_length=1)


def _merge_ig_format_with_texts(
    *,
    source_entries: list[dict[str, Any]],
    picks: IgTextPickOutput,
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
            raise ValueError(f"ig_text LLM returned unknown slotKey: {slot_key}")
        texts = [{"field": row.field.strip(), "value": row.value.strip()} for row in pick.texts]
        merged.append({**source_entry, "texts": texts})
    if len(merged) != len(source_entries):
        merged_keys = {str(row.get("slotKey") or "").strip() for row in merged}
        missing = sorted(set(source_by_key) - merged_keys)
        if missing:
            raise ValueError("ig_text LLM omitted slotKeys: " + ", ".join(missing[:5]))
    return sort_ig_plan_entries(merged)


async def fetch_and_prepare(state: IgTextState, *, client: httpx.AsyncClient) -> dict[str, Any]:
    del client
    _trace(state, "execute_skill", skill_id="ig_text")

    injected = str(state.get("injected_prior_context_markdown") or "").strip()
    if not injected:
        raise ValueError(
            "ig_text requires a prior restaurant_campaign_brief milestone with saved data "
            "for copy orientation — place Campaign brief before IG Text in the timeline."
        )

    prior_json = str(state.get("prior_milestones_data") or "")
    preferred_format = preferred_milestone_id_from_input(
        state.get("milestone_input"),
        "sourceIgFormatMilestoneId",
    )
    prior_row = extract_ig_format_row(prior_json, preferred_milestone_id=preferred_format)
    prior_data = extract_ig_format_data(prior_json, preferred_milestone_id=preferred_format)
    if prior_data is None or not ig_format_has_entries(prior_data):
        raise ValueError(ig_format_prior_error_message(prior_json, milestone_id="ig_text"))

    source_entries = _ig_format_entries(prior_data)
    if not source_entries:
        raise ValueError("ig_text requires at least one IG Format entry with menuItems and type")

    owner_notes = _fmt_owner_notes(state)
    goal = str(state.get("goal") or "")
    schedule_explanation = str(prior_data.get("scheduleExplanation") or "").strip()
    context_payload = {
        "goal": goal.strip() or None,
        "ownerNotes": owner_notes or None,
        "scheduleExplanation": schedule_explanation or None,
        "entries": source_entries,
    }

    preferred_brief = preferred_milestone_id_from_input(
        state.get("milestone_input"),
        "sourceCampaignBriefMilestoneId",
    )
    brief_row = extract_restaurant_campaign_brief_row(
        prior_json,
        preferred_milestone_id=preferred_brief,
    )
    brief_title = ""
    if isinstance(brief_row, dict):
        brief_title = str(brief_row.get("title") or "").strip()

    return {
        "prior_ig_format_row": prior_row or {},
        "prior_ig_format_data": prior_data,
        "source_ig_format_entries": source_entries,
        "generation_context_json": json.dumps(context_payload, ensure_ascii=False, indent=2),
        "source_campaign_brief_title": brief_title,
    }


async def generate_texts_with_llm(state: IgTextState) -> dict[str, Any]:
    source_entries = state.get("source_ig_format_entries")
    if not isinstance(source_entries, list) or not source_entries:
        raise ValueError("ig_text requires IG Format source entries")

    prior_data = state.get("prior_ig_format_data")
    if not isinstance(prior_data, dict):
        raise ValueError("ig_text requires prior IG Format data")

    schedule_explanation = str(prior_data.get("scheduleExplanation") or "").strip()
    if not schedule_explanation:
        raise ValueError("ig_text requires scheduleExplanation from prior IG Format")

    reporting_period = str(prior_data.get("reportingPeriod") or "").strip()
    if not reporting_period:
        raise ValueError("ig_text requires reportingPeriod from prior IG Format")

    analytics_run_id = str(prior_data.get("sourceAnalyticsRunId") or "").strip()
    if not analytics_run_id:
        raise ValueError("ig_text requires sourceAnalyticsRunId from prior IG Format")

    goal = str(state.get("goal") or "")
    owner_notes = _fmt_owner_notes(state)
    campaign_brief = str(state.get("injected_prior_context_markdown") or "").strip()
    context_payload = {
        "goal": goal.strip() or None,
        "ownerNotes": owner_notes or None,
        "scheduleExplanation": schedule_explanation,
        "entries": source_entries,
    }
    messages = build_ig_text_messages(
        goal=goal,
        owner_notes=owner_notes,
        campaign_brief=campaign_brief,
        context_payload=context_payload,
    )

    _trace(state, "generate_texts_with_llm")
    _trace_agent_event(state, "chat_model_start")

    last_error: Exception | None = None
    for attempt in range(1, IG_TEXT_MAX_ATTEMPTS + 1):
        try:
            generated = await structured_ainvoke_from_run_config(IgTextPickOutput, messages)
            merged_entries = _merge_ig_format_with_texts(
                source_entries=source_entries,
                picks=generated,
            )
            payload: dict[str, Any] = {
                "scheduleExplanation": schedule_explanation,
                "entries": merged_entries,
                "sourceAnalyticsRunId": analytics_run_id,
                "reportingPeriod": reporting_period,
            }
            prior_row = state.get("prior_ig_format_row")
            if isinstance(prior_row, dict):
                source_title = str(prior_row.get("title") or "").strip()
                if source_title:
                    payload["sourceIgFormatTitle"] = source_title
            brief_title = str(state.get("source_campaign_brief_title") or "").strip()
            if brief_title:
                payload["sourceCampaignBriefTitle"] = brief_title
            normalized = _normalize_generated_output(payload)
            _trace_agent_event(state, "chat_model_end")
            return {"generated_output": normalized}
        except (LLMInvokeError, ValueError) as exc:
            if isinstance(exc, LLMInvokeError):
                emit_llm_error_step(exc.code, str(exc))
                raise ValueError(str(exc)) from exc
            last_error = exc
            if attempt < IG_TEXT_MAX_ATTEMPTS:
                messages = [*messages, empty_text_retry_message()]
    raise last_error or ValueError("ig_text returned empty structured output")


def _build_eval_hints(state: IgTextState, payload: dict[str, Any]) -> dict[str, Any]:
    source_entries = state.get("source_ig_format_entries")
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

    prior_row = state.get("prior_ig_format_row")
    has_prior = isinstance(source_entries, list) and len(source_keys) > 0
    return {
        "hasPriorIgFormat": has_prior,
        "priorIgFormatEntryCount": len(source_keys),
        "sourceIgFormatSlotKeys": source_keys,
        "expectedOutputSlotKeys": source_keys,
        "outputSlotKeys": output_keys,
        "priorIgFormatTitle": (
            str(prior_row.get("title") or "").strip() if isinstance(prior_row, dict) else ""
        ),
        "sourceCampaignBriefTitle": str(state.get("source_campaign_brief_title") or "").strip(),
    }


async def persist_result(state: IgTextState, *, client: httpx.AsyncClient) -> dict[str, Any]:
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
    result_data = f"Generated Instagram text content for {entry_count} format slot(s)."
    eval_raw_data = json.dumps(eval_payload, ensure_ascii=False, indent=2)
    return {
        "result_data": result_data,
        "milestone_data": eval_payload,
        "milestonedata_written": True,
        "raw_data": eval_raw_data,
    }
