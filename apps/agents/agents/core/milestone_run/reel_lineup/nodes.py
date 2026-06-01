"""Nodes for reel_lineup fetch, LLM planning, and persistence."""

from __future__ import annotations

import json
from typing import Any, Literal

import httpx
from agents_app.agents.core.llm_invoke import (
    LLMInvokeError,
    STRUCTURED_OUTPUT_FAILED,
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
    extract_menu_clusterer_data,
    extract_menu_clusterer_row,
    extract_restaurant_campaign_brief_data,
    extract_restaurant_campaign_brief_row,
)
from agents_app.agents.core.milestone_run.reel_lineup.build import (
    build_reel_lineup_from_plan,
    coerce_campaign_weeks,
    reel_week_plan,
)
from agents_app.agents.core.milestone_run.reel_lineup.prompts import format_reel_lineup_system
from agents_app.agents.core.milestone_run.reel_lineup.state import ReelLineupOutput, ReelLineupState
from langchain_core.messages import BaseMessage, HumanMessage, SystemMessage
from langgraph.config import get_stream_writer
from pydantic import BaseModel, Field

REEL_LINEUP_MERGE_MAX_ATTEMPTS = 3


def _trace(state: ReelLineupState, step: str, **extra: Any) -> None:
    payload: dict[str, Any] = {"step": step, **extra}
    run_id = state.get("run_id")
    if isinstance(run_id, str) and run_id:
        payload["run_id"] = run_id
    get_stream_writer()(payload)


def _trace_agent_event(state: ReelLineupState, kind: str, **extra: Any) -> None:
    payload: dict[str, Any] = {"agent_event": {"kind": kind, **extra}}
    run_id = state.get("run_id")
    if isinstance(run_id, str) and run_id:
        payload["run_id"] = run_id
    get_stream_writer()(payload)


def _fmt_owner_notes(state: ReelLineupState) -> str:
    raw = state.get("milestone_input")
    if not isinstance(raw, dict):
        return ""
    if raw.get("type") != "reel_lineup":
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
        "_Optional owner guidance for reel emphasis. Treat as hints, not verified facts._\n\n"
        f"{text}"
    )


def _groups(data: dict[str, Any]) -> list[dict[str, Any]]:
    raw_groups = data.get("groups")
    if not isinstance(raw_groups, list):
        return []
    return [row for row in raw_groups if isinstance(row, dict)]


def _compact_group(group: dict[str, Any]) -> dict[str, Any]:
    raw_items = group.get("items")
    items: list[dict[str, Any]] = []
    if isinstance(raw_items, list):
        for item in raw_items:
            if not isinstance(item, dict):
                continue
            items.append(
                {
                    "name": str(item.get("name") or "").strip(),
                    "role": item.get("role"),
                    "category": item.get("category"),
                    "storytellingFit": item.get("storytellingFit"),
                    "reelMoment": item.get("reelMoment"),
                }
            )
    return {
        "id": str(group.get("id") or "").strip(),
        "leadName": str(group.get("leadName") or "").strip(),
        "items": items,
        "clusterDescription": group.get("clusterDescription"),
        "strategyFocus": group.get("strategyFocus"),
        "creativeRole": group.get("creativeRole"),
        "mix": group.get("mix"),
        "scheduleHints": group.get("scheduleHints"),
        "anchor": group.get("anchor"),
    }


def _build_generation_context(
    *,
    campaign_brief_data: dict[str, Any],
    groups: list[dict[str, Any]],
    start_date: str,
    end_date: str,
    weeks: list[dict[str, Any]],
    owner_notes_markdown: str,
) -> str:
    brief_excerpt = {
        "venueSnapshot": campaign_brief_data.get("venueSnapshot"),
        "overallStrategy": campaign_brief_data.get("overallStrategy"),
        "contentPillars": campaign_brief_data.get("contentPillars"),
        "audienceHypotheses": campaign_brief_data.get("audienceHypotheses"),
        "proofOrientedAngles": campaign_brief_data.get("proofOrientedAngles"),
        "mainCategory": campaign_brief_data.get("mainCategory"),
        "toneGuardrails": campaign_brief_data.get("toneGuardrails"),
        "messageHierarchy": campaign_brief_data.get("messageHierarchy"),
        "offerAndCtaPlan": campaign_brief_data.get("offerAndCtaPlan"),
    }
    compact_groups = [_compact_group(group) for group in groups]
    sections = [
        "## Campaign window\n```json\n"
        f"{json.dumps({'startDate': start_date, 'endDate': end_date, 'weekCount': len(weeks)}, ensure_ascii=False, indent=2)}\n```",
        "## Week plan (one weekday reel + one weekend reel per week)\n```json\n"
        f"{json.dumps(weeks, ensure_ascii=False, indent=2)}\n```",
        "## Campaign brief (excerpt)\n```json\n"
        f"{json.dumps(brief_excerpt, ensure_ascii=False, indent=2)}\n```",
        "## Menu clusterer groups\n```json\n"
        f"{json.dumps(compact_groups, ensure_ascii=False, indent=2)}\n```",
    ]
    if owner_notes_markdown.strip():
        sections.append(owner_notes_markdown.strip())
    return "\n\n".join(sections)


class ReelLineupPlannedReelDraft(BaseModel):
    """Flat reel row for structured output (avoids nested weekdayReel/weekendReel objects)."""

    weekIndex: int = Field(ge=1, description="Week index from the campaign week plan table")
    intent: Literal["weekday_reel", "weekend_reel"] = Field(
        description="weekday_reel for lunch/weekday slot; weekend_reel for weekend slot"
    )
    groupId: str = Field(
        min_length=1,
        description="One menu clusterer group id from the input groups list",
    )
    title: str = Field(min_length=1)
    description: str = Field(min_length=1)
    explanation: str = Field(min_length=1)


class ReelLineupDraftOutput(BaseModel):
    reels: list[ReelLineupPlannedReelDraft] = Field(
        min_length=1,
        description=(
            "Two reels per campaign week: one weekday_reel and one weekend_reel per weekIndex"
        ),
    )


def _weekly_reels_from_planned_reels(
    reels: list[ReelLineupPlannedReelDraft],
    *,
    expected_week_count: int,
) -> list[dict[str, Any]]:
    """Group flat LLM reel rows into weeklyReels shape for build_reel_lineup_from_plan."""
    expected_reel_count = expected_week_count * 2
    if len(reels) != expected_reel_count:
        raise ValueError(
            f"reels must contain exactly {expected_reel_count} entries "
            f"({expected_week_count} weeks × weekday + weekend); got {len(reels)}"
        )

    by_week: dict[int, dict[str, Any]] = {}
    for reel in reels:
        week = by_week.setdefault(reel.weekIndex, {"weekIndex": reel.weekIndex})
        if reel.intent == "weekday_reel":
            slot_key = "weekdayReel"
        else:
            slot_key = "weekendReel"
        if slot_key in week:
            raise ValueError(
                f"duplicate {reel.intent} for weekIndex {reel.weekIndex}; "
                "each week needs exactly one weekday_reel and one weekend_reel"
            )
        week[slot_key] = {
            "groupId": reel.groupId.strip(),
            "title": reel.title.strip(),
            "description": reel.description.strip(),
            "explanation": reel.explanation.strip(),
        }

    if len(by_week) != expected_week_count:
        raise ValueError(
            f"reels must cover exactly {expected_week_count} distinct weekIndex values; "
            f"got {len(by_week)}"
        )

    weekly: list[dict[str, Any]] = []
    for week_index in sorted(by_week):
        week = by_week[week_index]
        if "weekdayReel" not in week:
            raise ValueError(f"weekIndex {week_index} is missing weekday_reel")
        if "weekendReel" not in week:
            raise ValueError(f"weekIndex {week_index} is missing weekend_reel")
        weekly.append(week)
    return weekly


def _structured_output_correction_message(
    error: str,
    *,
    expected_week_count: int,
) -> HumanMessage:
    expected_reels = expected_week_count * 2
    return HumanMessage(
        content=(
            "Your previous JSON did not match the required schema.\n\n"
            f"Parser error: {error[:800]}\n\n"
            f'Return one object with key "reels": an array of exactly {expected_reels} '
            f"objects ({expected_week_count} campaign weeks × weekday + weekend).\n"
            "Each array item must be a flat object with these keys (no nesting):\n"
            '- weekIndex (integer from week plan)\n'
            '- intent ("weekday_reel" or "weekend_reel")\n'
            "- groupId (string id from Menu clusterer groups)\n"
            "- title, description, explanation (non-empty strings)\n"
            "Do not use weeklyReels, weekdayReel, or weekendReel wrapper objects."
        )
    )


def _merge_correction_message(error: ValueError, *, expected_week_count: int) -> HumanMessage:
    return HumanMessage(
        content=(
            "Your previous reel lineup plan could not be merged with the menu clusterer data.\n\n"
            f"Error: {error}\n\n"
            f'Return a corrected JSON object only. "reels" must contain exactly '
            f"{expected_week_count * 2} flat objects ({expected_week_count} weeks × "
            "weekday_reel + weekend_reel). Each object needs weekIndex, intent, groupId, "
            "title, description, and explanation. groupId must be from Menu clusterer "
            "groups in the input."
        )
    )


def _normalize_generated_output(payload: Any) -> ReelLineupOutput:
    if not isinstance(payload, dict):
        raise ValueError("reel_lineup output validation failed")
    normalized, error = validate_skill_output("reel_lineup", payload)
    if error is not None or not isinstance(normalized, dict):
        raise ValueError(error or "reel_lineup output validation failed")
    return normalized  # type: ignore[return-value]


async def fetch_and_prepare(state: ReelLineupState, *, client: httpx.AsyncClient) -> dict[str, Any]:
    del client
    _trace(state, "execute_skill", skill_id="reel_lineup")

    prior_json = str(state.get("prior_milestones_data") or "")
    dates_data = extract_dates_data(prior_json)
    if dates_data is None:
        raise ValueError(dates_prior_error_message(prior_json, milestone_id="reel_lineup"))

    start_date = str(dates_data.get("startDate") or "").strip()
    end_date = str(dates_data.get("endDate") or "").strip()
    if not start_date or not end_date:
        raise ValueError("reel_lineup requires prior dates milestone with startDate and endDate")

    campaign_brief_data = extract_restaurant_campaign_brief_data(prior_json)
    if campaign_brief_data is None:
        raise ValueError(campaign_brief_prior_error_message(prior_json, milestone_id="reel_lineup"))

    menu_clusterer_data = extract_menu_clusterer_data(prior_json)
    if menu_clusterer_data is None:
        raise ValueError("reel_lineup requires a prior menu_clusterer milestone with saved groups")

    groups = _groups(menu_clusterer_data)
    if not groups:
        raise ValueError("reel_lineup requires at least one group in prior menu_clusterer data")

    computed_weeks = campaign_weeks(
        start_date,
        end_date,
        campaign_brief_data=campaign_brief_data,
    )
    if not computed_weeks:
        raise ValueError("reel_lineup requires a valid campaign window with at least one week")

    campaign_brief_row = extract_restaurant_campaign_brief_row(prior_json)
    source_campaign_brief_title = ""
    if isinstance(campaign_brief_row, dict):
        brief_title = campaign_brief_row.get("title")
        if isinstance(brief_title, str) and brief_title.strip():
            source_campaign_brief_title = brief_title.strip()

    menu_clusterer_row = extract_menu_clusterer_row(prior_json)
    source_menu_clusterer_title = ""
    if isinstance(menu_clusterer_row, dict):
        title = menu_clusterer_row.get("title")
        if isinstance(title, str) and title.strip():
            source_menu_clusterer_title = title.strip()

    dates_row = extract_dates_row(prior_json)
    source_dates_title = ""
    if isinstance(dates_row, dict):
        title = dates_row.get("title")
        if isinstance(title, str) and title.strip():
            source_dates_title = title.strip()

    return {
        "owner_notes_markdown": _fmt_owner_notes(state),
        "dates_data": dates_data,
        "start_date": start_date,
        "end_date": end_date,
        "source_dates_title": source_dates_title,
        "campaign_weeks": computed_weeks,
        "campaign_brief_data": campaign_brief_data,
        "source_campaign_brief_title": source_campaign_brief_title,
        "groups": groups,
        "source_menu_clusterer_title": source_menu_clusterer_title,
    }


async def plan_reels(state: ReelLineupState) -> dict[str, Any]:
    campaign_brief_data = state.get("campaign_brief_data")
    if not isinstance(campaign_brief_data, dict):
        raise ValueError("reel_lineup requires campaign_brief_data")

    groups = state.get("groups") or []
    if not groups:
        raise ValueError("reel_lineup requires groups")

    start_date = str(state.get("start_date") or "").strip()
    end_date = str(state.get("end_date") or "").strip()
    if not start_date or not end_date:
        raise ValueError("reel_lineup requires start_date and end_date from prior dates milestone")

    campaign_weeks_list = coerce_campaign_weeks(state.get("campaign_weeks") or [])
    if not campaign_weeks_list:
        raise ValueError("reel_lineup requires campaign_weeks")

    week_plan = reel_week_plan(
        campaign_weeks_list,
        start_date=start_date,
        end_date=end_date,
        campaign_brief_data=campaign_brief_data,
    )
    expected_week_count = len(week_plan)

    owner_notes = ""
    owner_md = str(state.get("owner_notes_markdown") or "").strip()
    if owner_md:
        owner_notes = owner_md.split("\n\n", 2)[-1].strip() if "\n\n" in owner_md else owner_md

    generation_context = _build_generation_context(
        campaign_brief_data=campaign_brief_data,
        groups=groups,
        start_date=start_date,
        end_date=end_date,
        weeks=week_plan,
        owner_notes_markdown=str(state.get("owner_notes_markdown") or ""),
    )

    _trace(state, "plan_reels_generate")
    _trace_agent_event(state, "chat_model_start")

    base_messages: list[BaseMessage] = [
        SystemMessage(content=format_reel_lineup_system()),
        HumanMessage(content=generation_context),
    ]
    merge_error: ValueError | None = None
    structured_parse_error: str | None = None

    for attempt in range(1, REEL_LINEUP_MERGE_MAX_ATTEMPTS + 1):
        messages = list(base_messages)
        if structured_parse_error is not None:
            messages.append(
                _structured_output_correction_message(
                    structured_parse_error,
                    expected_week_count=expected_week_count,
                )
            )
        elif merge_error is not None:
            messages.append(
                _merge_correction_message(merge_error, expected_week_count=expected_week_count)
            )
        try:
            generated = await structured_ainvoke_from_run_config(
                ReelLineupDraftOutput,
                messages,
            )
            structured_parse_error = None
        except LLMInvokeError as exc:
            if (
                exc.code == STRUCTURED_OUTPUT_FAILED
                and attempt < REEL_LINEUP_MERGE_MAX_ATTEMPTS
            ):
                structured_parse_error = str(exc)
                _trace(
                    state,
                    "plan_reels_structured_retry",
                    attempt=attempt,
                    max_attempts=REEL_LINEUP_MERGE_MAX_ATTEMPTS,
                )
                continue
            emit_llm_error_step(exc.code, str(exc))
            raise

        try:
            weekly_reels = _weekly_reels_from_planned_reels(
                generated.reels,
                expected_week_count=expected_week_count,
            )

            payload = build_reel_lineup_from_plan(
                weekly_reels=weekly_reels,
                campaign_weeks=campaign_weeks_list,
                groups=groups,
                campaign_brief_data=campaign_brief_data,
                start_date=start_date,
                end_date=end_date,
                source_menu_clusterer_title=str(state.get("source_menu_clusterer_title") or ""),
                source_campaign_brief_title=str(state.get("source_campaign_brief_title") or ""),
                source_dates_title=str(state.get("source_dates_title") or ""),
                notes=owner_notes,
            )
            normalized = _normalize_generated_output(payload)
            _trace(state, "plan_reels_complete", reel_count=len(normalized.get("reels") or []))
            return {"generated_output": normalized}
        except ValueError as exc:
            merge_error = exc
            _trace(
                state,
                "plan_reels_merge_retry",
                attempt=attempt,
                max_attempts=REEL_LINEUP_MERGE_MAX_ATTEMPTS,
                error=str(exc)[:300],
            )
            if attempt >= REEL_LINEUP_MERGE_MAX_ATTEMPTS:
                raise ValueError(
                    f"reel_lineup planning failed after {attempt} attempts: {exc}"
                ) from exc

    raise ValueError("reel_lineup planning failed")


async def persist_result(state: ReelLineupState, *, client: httpx.AsyncClient) -> dict[str, Any]:
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
