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
    extract_post_lineup_data,
    extract_post_lineup_row,
    extract_story_lineup_data,
    extract_story_lineup_row,
    story_lineup_prior_error_message,
)
from agents_app.agents.core.milestone_run.scheduler.state import SchedulerOutput, SchedulerState
from langgraph.config import get_stream_writer

HAPPY_HOLIDAY_STORY_TIME = "10:00"
PINNED_MONTHLY_MENU_SLOT_TITLE = "Post: monthly top menu"
DEFAULT_STORY_SLOT_TIME = "10:00"


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


def _has_pinned_monthly_menu_post(post_lineup_data: dict[str, Any] | None) -> bool:
    if not isinstance(post_lineup_data, dict):
        return False
    posts = post_lineup_data.get("posts")
    if not isinstance(posts, list):
        return False
    for post in posts:
        if not isinstance(post, dict):
            continue
        if str(post.get("intent") or "").strip() == "pinned_monthly_menu":
            return True
    return False


def _month_starts_in_window(start_date: str, end_date: str) -> list[str]:
    if not start_date or not end_date or start_date > end_date:
        return []

    start_year = int(start_date[:4])
    start_month = int(start_date[5:7])
    end_year = int(end_date[:4])
    end_month = int(end_date[5:7])

    dates: list[str] = []
    year, month = start_year, start_month
    while (year, month) <= (end_year, end_month):
        month_start = f"{year:04d}-{month:02d}-01"
        if start_date <= month_start <= end_date:
            dates.append(month_start)
        if month == 12:
            year += 1
            month = 1
        else:
            month += 1
    return dates


def _build_pinned_monthly_menu_slots(start_date: str, end_date: str) -> list[dict[str, str]]:
    return [
        {
            "date": date,
            "time": HAPPY_HOLIDAY_STORY_TIME,
            "title": PINNED_MONTHLY_MENU_SLOT_TITLE,
        }
        for date in _month_starts_in_window(start_date, end_date)
    ]


def _build_slots_from_story_lineup(
    story_lineup_data: dict[str, Any],
    *,
    start_date: str,
    end_date: str,
) -> list[dict[str, str]]:
    stories = story_lineup_data.get("stories")
    if not isinstance(stories, list):
        return []

    slots: list[dict[str, str]] = []
    seen: set[tuple[str, str, str]] = set()

    for story in stories:
        if not isinstance(story, dict):
            continue
        title = str(story.get("title") or "").strip()
        if not title:
            continue
        fixdate = bool(story.get("fixdate"))
        date = str(story.get("date") or "").strip()
        if fixdate:
            if not date or date < start_date or date > end_date:
                continue
        else:
            continue

        time = str(story.get("time") or DEFAULT_STORY_SLOT_TIME).strip() or DEFAULT_STORY_SLOT_TIME
        key = (date, time, title)
        if key in seen:
            continue
        seen.add(key)
        slots.append({"date": date, "time": time, "title": title})

    return slots


async def fetch_and_prepare(state: SchedulerState, *, client: httpx.AsyncClient) -> dict[str, Any]:
    del client
    _trace(state, "execute_skill", skill_id="scheduler")

    prior_json = str(state.get("prior_milestones_data") or "")
    dates_data = extract_dates_data(prior_json)
    if dates_data is None:
        raise ValueError(dates_prior_error_message(prior_json, milestone_id="scheduler"))

    story_lineup_data = extract_story_lineup_data(prior_json)
    if story_lineup_data is None:
        raise ValueError(story_lineup_prior_error_message(prior_json))

    dates_row = extract_dates_row(prior_json)
    source_dates_title = ""
    if isinstance(dates_row, dict):
        title = dates_row.get("title")
        if isinstance(title, str) and title.strip():
            source_dates_title = title.strip()

    story_lineup_row = extract_story_lineup_row(prior_json)
    source_story_lineup_title = ""
    if isinstance(story_lineup_row, dict):
        story_title = story_lineup_row.get("title")
        if isinstance(story_title, str) and story_title.strip():
            source_story_lineup_title = story_title.strip()

    post_lineup_data = extract_post_lineup_data(prior_json)
    post_lineup_row = extract_post_lineup_row(prior_json)
    source_post_lineup_title = ""
    if isinstance(post_lineup_row, dict):
        post_title = post_lineup_row.get("title")
        if isinstance(post_title, str) and post_title.strip():
            source_post_lineup_title = post_title.strip()

    return {
        "dates_data": dates_data,
        "source_dates_title": source_dates_title,
        "story_lineup_data": story_lineup_data,
        "source_story_lineup_title": source_story_lineup_title,
        "post_lineup_data": post_lineup_data,
        "source_post_lineup_title": source_post_lineup_title,
    }


async def build_snapshot(state: SchedulerState) -> dict[str, Any]:
    dates_data = state.get("dates_data")
    if not isinstance(dates_data, dict):
        raise ValueError("scheduler requires prior dates milestone data")

    story_lineup_data = state.get("story_lineup_data")
    if not isinstance(story_lineup_data, dict):
        raise ValueError("scheduler requires prior story_lineup milestone data")

    start_date = str(dates_data.get("startDate") or "").strip()
    end_date = str(dates_data.get("endDate") or "").strip()
    if not start_date or not end_date:
        raise ValueError("scheduler requires prior dates milestone with startDate and endDate")

    public_holidays = dates_data.get("publicHolidays")
    if not isinstance(public_holidays, list):
        public_holidays = []

    slots = _build_slots_from_story_lineup(
        story_lineup_data,
        start_date=start_date,
        end_date=end_date,
    )

    post_lineup_data = state.get("post_lineup_data")
    if _has_pinned_monthly_menu_post(
        post_lineup_data if isinstance(post_lineup_data, dict) else None
    ):
        slots.extend(_build_pinned_monthly_menu_slots(start_date, end_date))

    slots.sort(key=lambda slot: (slot["date"], slot["time"], slot["title"]))

    payload: dict[str, Any] = {
        "startDate": start_date,
        "endDate": end_date,
        "publicHolidays": public_holidays,
        "slots": slots,
    }
    source_dates_title = str(state.get("source_dates_title") or "").strip()
    if source_dates_title:
        payload["sourceDatesTitle"] = source_dates_title
    source_story_lineup_title = str(state.get("source_story_lineup_title") or "").strip()
    if source_story_lineup_title:
        payload["sourceStoryLineupTitle"] = source_story_lineup_title
    source_post_lineup_title = str(state.get("source_post_lineup_title") or "").strip()
    if source_post_lineup_title:
        payload["sourcePostLineupTitle"] = source_post_lineup_title

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
