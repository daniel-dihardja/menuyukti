"""Nodes for scheduler fetch, LLM schedule generation, and persistence."""

from __future__ import annotations

import json
import re
from datetime import date
from typing import Any, Literal

import httpx
from agents_app.agents.core.llm_invoke import (
    STRUCTURED_OUTPUT_FAILED,
    LLMInvokeError,
    emit_llm_error_step,
)
from agents_app.agents.core.milestone_run.dates_window import campaign_weeks
from agents_app.agents.core.milestone_run.graphql_client import upsert_milestonedata_node
from agents_app.agents.core.milestone_run.llm_from_run_config import (
    structured_ainvoke_from_run_config,
)
from agents_app.agents.core.milestone_run.output_schema import validate_skill_output
from agents_app.agents.core.milestone_run.prior_context_inject import (
    campaign_brief_prior_error_message,
    dates_prior_error_message,
    extract_dates_data,
    extract_dates_row,
    extract_restaurant_campaign_brief_data,
    extract_restaurant_campaign_brief_row,
    preferred_milestone_id_from_input,
)
from agents_app.agents.core.milestone_run.scheduler.prompts import (
    SCHEDULE_EXPLANATION_MAX_CHARS,
    SCHEDULE_EXPLANATION_MAX_WORDS,
    SCHEDULE_EXPLANATION_TARGET_CHARS,
    format_scheduler_system,
)
from agents_app.agents.core.milestone_run.scheduler.state import SchedulerOutput, SchedulerState
from langchain_core.messages import BaseMessage, HumanMessage, SystemMessage
from langgraph.config import get_stream_writer
from pydantic import BaseModel, Field

SCHEDULER_MAX_ATTEMPTS = 3
_TIME_PATTERN = re.compile(r"^\d{2}:\d{2}$")


class SchedulerDraftSlot(BaseModel):
    kind: Literal["story", "post", "reel"]
    date: str
    time: str
    title: str = Field(min_length=1)


class SchedulerDraftOutput(BaseModel):
    slots: list[SchedulerDraftSlot]
    scheduleExplanation: str = Field(
        min_length=1,
        max_length=SCHEDULE_EXPLANATION_MAX_CHARS,
        description=(
            f"Exactly 2 short sentences explaining key scheduling choices, "
            f"max {SCHEDULE_EXPLANATION_MAX_WORDS} words, aim ~{SCHEDULE_EXPLANATION_TARGET_CHARS} "
            f"characters, hard max {SCHEDULE_EXPLANATION_MAX_CHARS} characters."
        ),
    )


def _trace(state: SchedulerState, step: str, **extra: Any) -> None:
    payload: dict[str, Any] = {"step": step, **extra}
    run_id = state.get("run_id")
    if isinstance(run_id, str) and run_id:
        payload["run_id"] = run_id
    get_stream_writer()(payload)


def _trace_agent_event(state: SchedulerState, kind: str, **extra: Any) -> None:
    payload: dict[str, Any] = {"agent_event": {"kind": kind, **extra}}
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


def _parse_iso_date(value: str) -> date | None:
    text = value.strip()
    if not text:
        return None
    try:
        return date.fromisoformat(text)
    except ValueError:
        return None


def _build_generation_context(
    *,
    dates_data: dict[str, Any],
    campaign_brief_data: dict[str, Any],
    start_date: str,
    end_date: str,
) -> str:
    weeks = campaign_weeks(start_date, end_date, campaign_brief_data=campaign_brief_data)
    brief_excerpt = {
        "overallStrategy": campaign_brief_data.get("overallStrategy"),
        "messageHierarchy": campaign_brief_data.get("messageHierarchy"),
        "offerAndCtaPlan": campaign_brief_data.get("offerAndCtaPlan"),
        "contentPillars": campaign_brief_data.get("contentPillars"),
        "contentPillarPlan": campaign_brief_data.get("contentPillarPlan"),
    }
    context_payload = {
        "window": {
            "startDate": start_date,
            "endDate": end_date,
            "weeks": [
                {
                    "index": week.week_index,
                    "weekStart": week.week_start,
                    "weekEnd": week.week_end,
                }
                for week in weeks
            ],
            "publicHolidays": dates_data.get("publicHolidays")
            if isinstance(dates_data.get("publicHolidays"), list)
            else [],
        },
        "campaignBriefExcerpt": brief_excerpt,
    }

    return (
        "Generate schedule slots from the campaign window and campaign brief excerpt below.\n"
        "Return one object with keys `slots` and `scheduleExplanation`.\n"
        "Each slot item has: kind, date, time, title.\n"
        f"scheduleExplanation is required (2 short sentences per the system instructions; aim "
        f"~{SCHEDULE_EXPLANATION_TARGET_CHARS} chars, max {SCHEDULE_EXPLANATION_MAX_CHARS}).\n\n"
        f"```json\n{json.dumps(context_payload, ensure_ascii=False, indent=2)}\n```"
    )


def _scheduler_correction_message(error: str) -> HumanMessage:
    return HumanMessage(
        content=(
            "Your previous output was invalid. Return a corrected JSON object with keys "
            "`slots` and `scheduleExplanation`.\n"
            f"Validation error: {error[:1200]}\n"
            "Each slot item must include: kind, date, time, title.\n"
            f"scheduleExplanation must be exactly 2 short sentences, non-empty, and at most "
            f"{SCHEDULE_EXPLANATION_MAX_CHARS} characters (aim ~{SCHEDULE_EXPLANATION_TARGET_CHARS})."
        )
    )


def _validate_scheduler_rules(
    slots: list[SchedulerDraftSlot],
    *,
    start_date: str,
    end_date: str,
    campaign_brief_data: dict[str, Any],
) -> None:
    weeks = campaign_weeks(start_date, end_date, campaign_brief_data=campaign_brief_data)
    if not weeks:
        raise ValueError("scheduler requires at least one campaign week")

    if not slots:
        raise ValueError("scheduler must include at least one slot")

    for slot in slots:
        iso_date = slot.date.strip()
        slot_time = slot.time.strip()
        title = slot.title.strip()

        if _parse_iso_date(iso_date) is None:
            raise ValueError(f"invalid slot date: {iso_date}")
        if iso_date < start_date or iso_date > end_date:
            raise ValueError(f"slot date {iso_date} is outside campaign window")
        if not _TIME_PATTERN.match(slot_time):
            raise ValueError(f"invalid slot time (expected HH:MM): {slot_time}")
        if not title:
            raise ValueError("slot title must be non-empty")

        week = next((row for row in weeks if row.week_start <= iso_date <= row.week_end), None)
        if week is None:
            raise ValueError(f"slot date {iso_date} does not map to a campaign week")


def _to_schedule_slot(draft: SchedulerDraftSlot) -> dict[str, Any]:
    return {
        "kind": draft.kind,
        "date": draft.date.strip(),
        "time": draft.time.strip(),
        "title": draft.title.strip(),
    }


async def fetch_and_prepare(state: SchedulerState, *, client: httpx.AsyncClient) -> dict[str, Any]:
    del client
    _trace(state, "execute_skill", skill_id="scheduler")

    prior_json = str(state.get("prior_milestones_data") or "")
    preferred_dates = preferred_milestone_id_from_input(
        state.get("milestone_input"),
        "sourceDatesMilestoneId",
    )
    preferred_brief = preferred_milestone_id_from_input(
        state.get("milestone_input"),
        "sourceCampaignBriefMilestoneId",
    )
    dates_data = extract_dates_data(prior_json, preferred_milestone_id=preferred_dates)
    if dates_data is None:
        raise ValueError(dates_prior_error_message(prior_json, milestone_id="scheduler"))

    campaign_brief_data = extract_restaurant_campaign_brief_data(
        prior_json,
        preferred_milestone_id=preferred_brief,
    )
    if campaign_brief_data is None:
        raise ValueError(campaign_brief_prior_error_message(prior_json, milestone_id="scheduler"))

    dates_row = extract_dates_row(prior_json, preferred_milestone_id=preferred_dates)
    source_dates_title = ""
    if isinstance(dates_row, dict):
        title = dates_row.get("title")
        if isinstance(title, str) and title.strip():
            source_dates_title = title.strip()

    campaign_brief_row = extract_restaurant_campaign_brief_row(
        prior_json,
        preferred_milestone_id=preferred_brief,
    )
    source_campaign_brief_title = ""
    if isinstance(campaign_brief_row, dict):
        brief_title = campaign_brief_row.get("title")
        if isinstance(brief_title, str) and brief_title.strip():
            source_campaign_brief_title = brief_title.strip()

    return {
        "dates_data": dates_data,
        "source_dates_title": source_dates_title,
        "campaign_brief_data": campaign_brief_data,
        "source_campaign_brief_title": source_campaign_brief_title,
    }


async def generate_schedule_with_llm(state: SchedulerState) -> dict[str, Any]:
    dates_data = state.get("dates_data")
    if not isinstance(dates_data, dict):
        raise ValueError("scheduler requires prior dates milestone data")

    campaign_brief_data = state.get("campaign_brief_data")
    if not isinstance(campaign_brief_data, dict):
        raise ValueError("scheduler requires prior restaurant_campaign_brief milestone data")

    start_date = str(dates_data.get("startDate") or "").strip()
    end_date = str(dates_data.get("endDate") or "").strip()
    if not start_date or not end_date:
        raise ValueError("scheduler requires prior dates milestone with startDate and endDate")

    public_holidays = dates_data.get("publicHolidays")
    if not isinstance(public_holidays, list):
        public_holidays = []

    generation_context = _build_generation_context(
        dates_data=dates_data,
        campaign_brief_data=campaign_brief_data,
        start_date=start_date,
        end_date=end_date,
    )

    base_messages: list[BaseMessage] = [
        SystemMessage(content=format_scheduler_system()),
        HumanMessage(content=generation_context),
    ]
    retry_error: str | None = None

    _trace(state, "generate_schedule_with_llm")
    _trace_agent_event(state, "chat_model_start")
    for attempt in range(1, SCHEDULER_MAX_ATTEMPTS + 1):
        messages = list(base_messages)
        if retry_error is not None:
            messages.append(_scheduler_correction_message(retry_error))
        try:
            generated = await structured_ainvoke_from_run_config(SchedulerDraftOutput, messages)
        except LLMInvokeError as exc:
            if exc.code == STRUCTURED_OUTPUT_FAILED and attempt < SCHEDULER_MAX_ATTEMPTS:
                retry_error = str(exc)
                continue
            emit_llm_error_step(exc.code, str(exc))
            raise ValueError(str(exc)) from exc

        try:
            _validate_scheduler_rules(
                generated.slots,
                start_date=start_date,
                end_date=end_date,
                campaign_brief_data=campaign_brief_data,
            )
            schedule_slots = [_to_schedule_slot(slot) for slot in generated.slots]
            schedule_slots.sort(
                key=lambda slot: (
                    str(slot.get("date") or ""),
                    str(slot.get("time") or ""),
                    str(slot.get("kind") or ""),
                    str(slot.get("title") or ""),
                )
            )

            schedule_explanation = generated.scheduleExplanation.strip()
            if not schedule_explanation:
                raise ValueError("scheduleExplanation must be non-empty")
            if len(schedule_explanation) > SCHEDULE_EXPLANATION_MAX_CHARS:
                raise ValueError(
                    f"scheduleExplanation exceeds {SCHEDULE_EXPLANATION_MAX_CHARS} characters"
                )

            payload: dict[str, Any] = {
                "startDate": start_date,
                "endDate": end_date,
                "publicHolidays": public_holidays,
                "slots": schedule_slots,
                "scheduleExplanation": schedule_explanation,
            }
            source_dates_title = str(state.get("source_dates_title") or "").strip()
            if source_dates_title:
                payload["sourceDatesTitle"] = source_dates_title
            source_campaign_brief_title = str(
                state.get("source_campaign_brief_title") or ""
            ).strip()
            if source_campaign_brief_title:
                payload["sourceCampaignBriefTitle"] = source_campaign_brief_title

            normalized = _normalize_generated_output(payload)
            _trace_agent_event(state, "chat_model_end")
            return {"generated_output": normalized}
        except ValueError as exc:
            retry_error = str(exc)
            if attempt >= SCHEDULER_MAX_ATTEMPTS:
                _trace_agent_event(state, "chat_model_end")
                raise ValueError(
                    f"scheduler planning failed after {attempt} attempts: {exc}"
                ) from exc

    _trace_agent_event(state, "chat_model_end")
    raise ValueError("scheduler planning failed")


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
