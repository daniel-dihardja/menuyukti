"""Nodes for story_lineup fetch, LLM selection, build, and persistence."""

from __future__ import annotations

import json
import re
from typing import Any

import httpx
from agents_app.agents.core.milestone_run.graphql_client import upsert_milestonedata_node
from agents_app.agents.core.milestone_run.llm_from_run_config import (
    structured_llm_from_milestone_run_config,
)
from agents_app.agents.core.milestone_run.output_schema import validate_skill_output
from agents_app.agents.core.milestone_run.prior_context_inject import (
    dates_prior_error_message,
    extract_dates_data,
    extract_dates_row,
)
from agents_app.agents.core.milestone_run.story_lineup.prompts import (
    STORY_LINEUP_HOLIDAY_GREETINGS_SYSTEM,
)
from agents_app.agents.core.milestone_run.story_lineup.state import (
    StoryLineupOutput,
    StoryLineupState,
)
from langchain_core.messages import HumanMessage, SystemMessage
from langgraph.config import get_stream_writer
from pydantic import BaseModel

HAPPY_HOLIDAY_STORY_TIME = "10:00"


def _trace(state: StoryLineupState, step: str, **extra: Any) -> None:
    payload: dict[str, Any] = {"step": step, **extra}
    run_id = state.get("run_id")
    if isinstance(run_id, str) and run_id:
        payload["run_id"] = run_id
    get_stream_writer()(payload)


def _trace_agent_event(state: StoryLineupState, kind: str, **extra: Any) -> None:
    payload: dict[str, Any] = {"agent_event": {"kind": kind, **extra}}
    run_id = state.get("run_id")
    if isinstance(run_id, str) and run_id:
        payload["run_id"] = run_id
    get_stream_writer()(payload)


def _normalize_generated_output(payload: Any) -> StoryLineupOutput:
    if not isinstance(payload, dict):
        raise ValueError("story_lineup output validation failed")
    normalized, error = validate_skill_output("story_lineup", payload)
    if error is not None or not isinstance(normalized, dict):
        raise ValueError(error or "story_lineup output validation failed")
    return normalized  # type: ignore[return-value]


class HolidayGreetingPick(BaseModel):
    date: str
    holidayName: str


class StoryLineupHolidayGreetingsDraft(BaseModel):
    holidayGreetings: list[HolidayGreetingPick]


def _fmt_owner_holiday_notes(state: StoryLineupState) -> str:
    raw = state.get("milestone_input")
    if not isinstance(raw, dict):
        return ""
    if raw.get("type") != "story_lineup":
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
        "## Milestone input (owner holiday guidance)\n\n"
        "_Optional owner guidance for which public holidays should get Instagram Story "
        "greetings. Treat as hints, not verified facts._\n\n"
        f"{text}"
    )


def _holiday_dates_by_name(public_holidays: list[Any]) -> dict[str, set[str]]:
    by_name: dict[str, set[str]] = {}
    for holiday in public_holidays:
        if not isinstance(holiday, dict):
            continue
        date = str(holiday.get("date") or "").strip()
        if not date:
            continue
        name = str(holiday.get("name") or holiday.get("localName") or "").strip()
        if not name:
            continue
        by_name.setdefault(name, set()).add(date)
    return by_name


def _valid_holiday_dates(public_holidays: list[Any]) -> set[str]:
    dates: set[str] = set()
    for holiday in public_holidays:
        if not isinstance(holiday, dict):
            continue
        date = str(holiday.get("date") or "").strip()
        if date:
            dates.add(date)
    return dates


def _slugify_holiday_name(name: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", name.strip().lower())
    return slug.strip("-") or "holiday"


def _build_public_holiday_stories(
    picks: list[dict[str, str]],
    *,
    public_holidays: list[Any],
    start_date: str,
    end_date: str,
) -> list[dict[str, Any]]:
    valid_dates = _valid_holiday_dates(public_holidays)
    dates_by_name = _holiday_dates_by_name(public_holidays)
    stories: list[dict[str, Any]] = []
    seen: set[tuple[str, str]] = set()

    for pick in picks:
        date = str(pick.get("date") or "").strip()
        holiday_name = str(pick.get("holidayName") or "").strip()
        if not date or not holiday_name:
            continue
        if date < start_date or date > end_date:
            continue
        if date not in valid_dates:
            continue
        if date not in dates_by_name.get(holiday_name, set()):
            continue
        key = (date, holiday_name)
        if key in seen:
            continue
        seen.add(key)
        slug = _slugify_holiday_name(holiday_name)
        stories.append(
            {
                "id": f"story-public-holiday-{date}-{slug}",
                "title": f"Story: sending happy {holiday_name}",
                "date": date,
                "fixdate": True,
                "reason": "public_holiday",
                "holidayName": holiday_name,
                "time": HAPPY_HOLIDAY_STORY_TIME,
            }
        )

    stories.sort(key=lambda story: (str(story.get("date") or ""), str(story.get("title") or "")))
    return stories


async def fetch_and_prepare(
    state: StoryLineupState, *, client: httpx.AsyncClient
) -> dict[str, Any]:
    del client
    _trace(state, "execute_skill", skill_id="story_lineup")

    prior_json = str(state.get("prior_milestones_data") or "")
    dates_data = extract_dates_data(prior_json)
    if dates_data is None:
        raise ValueError(dates_prior_error_message(prior_json, milestone_id="story_lineup"))

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


async def select_public_holiday_stories(state: StoryLineupState) -> dict[str, Any]:
    """Use LLM to pick public holidays suited for a cheerful Story greeting."""
    dates_data = state.get("dates_data")
    if not isinstance(dates_data, dict):
        raise ValueError("story_lineup requires prior dates milestone data")

    public_holidays = dates_data.get("publicHolidays")
    if not isinstance(public_holidays, list) or not public_holidays:
        return {"holiday_greeting_picks": []}

    start_date = str(dates_data.get("startDate") or "").strip()
    end_date = str(dates_data.get("endDate") or "").strip()
    human_content = json.dumps(
        {
            "startDate": start_date,
            "endDate": end_date,
            "publicHolidays": public_holidays,
        },
        ensure_ascii=False,
        indent=2,
    )
    owner_notes = _fmt_owner_holiday_notes(state)
    if owner_notes:
        human_content = f"{human_content}\n\n{owner_notes}"

    llm = structured_llm_from_milestone_run_config().with_structured_output(
        StoryLineupHolidayGreetingsDraft
    )
    _trace_agent_event(state, "chat_model_start")
    generated = await llm.ainvoke(
        [
            SystemMessage(content=STORY_LINEUP_HOLIDAY_GREETINGS_SYSTEM),
            HumanMessage(content=human_content),
        ]
    )
    _trace_agent_event(state, "chat_model_end")

    picks = [
        {"date": pick.date.strip(), "holidayName": pick.holidayName.strip()}
        for pick in generated.holidayGreetings
        if pick.date.strip() and pick.holidayName.strip()
    ]
    return {"holiday_greeting_picks": picks}


async def build_lineup(state: StoryLineupState) -> dict[str, Any]:
    dates_data = state.get("dates_data")
    if not isinstance(dates_data, dict):
        raise ValueError("story_lineup requires prior dates milestone data")

    start_date = str(dates_data.get("startDate") or "").strip()
    end_date = str(dates_data.get("endDate") or "").strip()
    if not start_date or not end_date:
        raise ValueError("story_lineup requires prior dates milestone with startDate and endDate")

    public_holidays = dates_data.get("publicHolidays")
    if not isinstance(public_holidays, list):
        public_holidays = []

    picks = state.get("holiday_greeting_picks")
    if not isinstance(picks, list):
        picks = []

    stories = _build_public_holiday_stories(
        picks,
        public_holidays=public_holidays,
        start_date=start_date,
        end_date=end_date,
    )

    payload: dict[str, Any] = {"stories": stories}
    source_title = str(state.get("source_dates_title") or "").strip()
    if source_title:
        payload["sourceDatesTitle"] = source_title

    normalized = _normalize_generated_output(payload)
    return {"generated_output": normalized}


async def persist_result(state: StoryLineupState, *, client: httpx.AsyncClient) -> dict[str, Any]:
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
