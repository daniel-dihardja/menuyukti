"""Nodes for scheduler fetch, snapshot, and persistence."""

from __future__ import annotations

from datetime import date, timedelta
import json
from typing import Any

import httpx
from agents_app.agents.core.milestone_run.graphql_client import upsert_milestonedata_node
from agents_app.agents.core.milestone_run.output_schema import validate_skill_output
from agents_app.agents.core.milestone_run.prior_context_inject import (
    campaign_brief_prior_error_message,
    dates_prior_error_message,
    extract_dates_data,
    extract_dates_row,
    extract_post_lineup_data,
    extract_post_lineup_row,
    extract_reel_lineup_data,
    extract_reel_lineup_row,
    extract_restaurant_campaign_brief_data,
    extract_restaurant_campaign_brief_row,
    extract_story_lineup_data,
    extract_story_lineup_row,
    reel_lineup_prior_error_message,
)
from agents_app.agents.core.milestone_run.scheduler.state import SchedulerOutput, SchedulerState
from langgraph.config import get_stream_writer

DEFAULT_REEL_SLOT_TIME = "11:00"
DEFAULT_REEL_WEEKDAYS = ("tuesday", "thursday")
DEFAULT_POST_SLOT_TIME = "10:00"
DEFAULT_STORY_SLOT_TIME = "10:00"
_WEEKDAY_INDEX = {
    "monday": 0,
    "tuesday": 1,
    "wednesday": 2,
    "thursday": 3,
    "friday": 4,
    "saturday": 5,
    "sunday": 6,
}


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


def _parse_iso_date(value: str) -> date | None:
    text = value.strip()
    if not text:
        return None
    try:
        return date.fromisoformat(text)
    except ValueError:
        return None


def _dates_in_window(start_date: str, end_date: str) -> list[str]:
    start = _parse_iso_date(start_date)
    end = _parse_iso_date(end_date)
    if start is None or end is None or start > end:
        return []
    dates: list[str] = []
    cursor = start
    while cursor <= end:
        dates.append(cursor.isoformat())
        cursor += timedelta(days=1)
    return dates


def _overall_strategy(campaign_brief_data: dict[str, Any] | None) -> dict[str, Any]:
    if not isinstance(campaign_brief_data, dict):
        return {}
    overall = campaign_brief_data.get("overallStrategy")
    return overall if isinstance(overall, dict) else {}


def _strategy_focus(campaign_brief_data: dict[str, Any] | None) -> str:
    overall = _overall_strategy(campaign_brief_data)
    return str(overall.get("strategyFocus") or "").strip() or "weekday_lunch"


def _offer_window(campaign_brief_data: dict[str, Any] | None) -> str:
    overall = _overall_strategy(campaign_brief_data)
    return str(overall.get("offerWindow") or "").strip() or "11:00-14:00"


def _preferred_weekdays(
    reel_lineup_data: dict[str, Any] | None,
    campaign_brief_data: dict[str, Any] | None,
) -> list[str]:
    focus = _strategy_focus(campaign_brief_data)
    if focus == "weekday_lunch":
        return list(DEFAULT_REEL_WEEKDAYS)
    groups = reel_lineup_data.get("groups") if isinstance(reel_lineup_data, dict) else None
    if isinstance(groups, list):
        for group in groups:
            if not isinstance(group, dict):
                continue
            hints = group.get("scheduleHints")
            if not isinstance(hints, dict):
                continue
            raw = hints.get("preferredWeekdays")
            if isinstance(raw, list):
                cleaned = [
                    str(value).strip().lower()
                    for value in raw
                    if str(value).strip().lower() in _WEEKDAY_INDEX
                ]
                if cleaned:
                    return cleaned
    if focus == "weekend_family":
        return ["friday", "sunday"]
    if focus == "evening_dinner":
        return ["wednesday", "friday"]
    return list(DEFAULT_REEL_WEEKDAYS)


def _preferred_time(
    reel_lineup_data: dict[str, Any] | None,
    campaign_brief_data: dict[str, Any] | None,
) -> str:
    focus = _strategy_focus(campaign_brief_data)
    if focus == "weekday_lunch":
        return DEFAULT_REEL_SLOT_TIME
    groups = reel_lineup_data.get("groups") if isinstance(reel_lineup_data, dict) else None
    if isinstance(groups, list):
        for group in groups:
            if not isinstance(group, dict):
                continue
            hints = group.get("scheduleHints")
            if not isinstance(hints, dict):
                continue
            text = str(hints.get("preferredTime") or "").strip()
            if text:
                return text
    if focus == "weekend_family":
        return "09:30"
    if focus == "evening_dinner":
        return "17:30"
    return DEFAULT_REEL_SLOT_TIME


def _eligible_food_groups(reel_lineup_data: dict[str, Any] | None) -> list[dict[str, Any]]:
    raw_groups = reel_lineup_data.get("groups") if isinstance(reel_lineup_data, dict) else None
    if not isinstance(raw_groups, list):
        return []
    groups: list[dict[str, Any]] = []
    for group in raw_groups:
        if not isinstance(group, dict):
            continue
        hints = group.get("scheduleHints")
        if isinstance(hints, dict) and hints.get("cadenceEligible") is False:
            continue
        groups.append(group)
    return groups


def _slot_dates(start_date: str, end_date: str, preferred_weekdays: list[str]) -> list[str]:
    weekday_indexes = {_WEEKDAY_INDEX[day] for day in preferred_weekdays if day in _WEEKDAY_INDEX}
    if not weekday_indexes:
        weekday_indexes = {_WEEKDAY_INDEX[day] for day in DEFAULT_REEL_WEEKDAYS}
    return [
        iso_date
        for iso_date in _dates_in_window(start_date, end_date)
        if (_parse_iso_date(iso_date) or date.min).weekday() in weekday_indexes
    ]


def _slot_title(group: dict[str, Any], campaign_brief_data: dict[str, Any] | None) -> str:
    lead_name = str(group.get("leadName") or "Lunch offer").strip() or "Lunch offer"
    focus = str(group.get("strategyFocus") or "").strip() or _strategy_focus(campaign_brief_data)
    role = str(group.get("creativeRole") or "").strip()
    offer_window = _offer_window(campaign_brief_data)
    if focus == "weekday_lunch":
        title = f"Reel: {lead_name} lunch offer ({offer_window})"
    else:
        title = f"Reel: {lead_name} {focus.replace('_', ' ')}"
    if role:
        title = f"{title} [{role}]"
    return title


def _first_of_month_dates(start_date: str, end_date: str) -> list[str]:
    start = _parse_iso_date(start_date)
    end = _parse_iso_date(end_date)
    if start is None or end is None or start > end:
        return []

    cursor = date(start.year, start.month, 1)
    dates: list[str] = []
    while cursor <= end:
        if cursor >= start:
            dates.append(cursor.isoformat())
        if cursor.month == 12:
            cursor = date(cursor.year + 1, 1, 1)
        else:
            cursor = date(cursor.year, cursor.month + 1, 1)
    return dates


def _build_reel_slots(
    reel_lineup_data: dict[str, Any],
    campaign_brief_data: dict[str, Any] | None,
    *,
    start_date: str,
    end_date: str,
) -> list[dict[str, str]]:
    groups = _eligible_food_groups(reel_lineup_data)
    if not groups:
        return []
    preferred_weekdays = _preferred_weekdays(reel_lineup_data, campaign_brief_data)
    preferred_time = _preferred_time(reel_lineup_data, campaign_brief_data)
    dates = _slot_dates(start_date, end_date, preferred_weekdays)
    slots: list[dict[str, str]] = []
    for index, iso_date in enumerate(dates):
        group = groups[index % len(groups)]
        slots.append(
            {
                "kind": "reel",
                "date": iso_date,
                "time": preferred_time,
                "title": _slot_title(group, campaign_brief_data),
            }
        )
    return slots


def _build_post_slots(
    post_lineup_data: dict[str, Any] | None,
    *,
    start_date: str,
    end_date: str,
) -> list[dict[str, str]]:
    posts = post_lineup_data.get("posts") if isinstance(post_lineup_data, dict) else None
    if not isinstance(posts, list):
        return []

    valid_posts = [
        post
        for post in posts
        if isinstance(post, dict) and str(post.get("title") or "").strip()
    ]
    if not valid_posts:
        return []

    dates = _first_of_month_dates(start_date, end_date)
    slots: list[dict[str, str]] = []
    for index, iso_date in enumerate(dates):
        post = valid_posts[index % len(valid_posts)]
        slots.append(
            {
                "kind": "post",
                "date": iso_date,
                "time": DEFAULT_POST_SLOT_TIME,
                "title": str(post.get("title") or "").strip(),
            }
        )
    return slots


def _build_story_slots(
    story_lineup_data: dict[str, Any] | None,
    *,
    start_date: str,
    end_date: str,
) -> list[dict[str, str]]:
    stories = story_lineup_data.get("stories") if isinstance(story_lineup_data, dict) else None
    if not isinstance(stories, list):
        return []

    slots: list[dict[str, str]] = []
    for story in stories:
        if not isinstance(story, dict):
            continue
        title = str(story.get("title") or "").strip()
        iso_date = str(story.get("date") or "").strip()
        if not title or not iso_date:
            continue
        if iso_date < start_date or iso_date > end_date:
            continue
        time = str(story.get("time") or "").strip() or DEFAULT_STORY_SLOT_TIME
        slots.append(
            {
                "kind": "story",
                "date": iso_date,
                "time": time,
                "title": title,
            }
        )
    return slots


async def fetch_and_prepare(state: SchedulerState, *, client: httpx.AsyncClient) -> dict[str, Any]:
    del client
    _trace(state, "execute_skill", skill_id="scheduler")

    prior_json = str(state.get("prior_milestones_data") or "")
    dates_data = extract_dates_data(prior_json)
    if dates_data is None:
        raise ValueError(dates_prior_error_message(prior_json, milestone_id="scheduler"))

    campaign_brief_data = extract_restaurant_campaign_brief_data(prior_json)
    if campaign_brief_data is None:
        raise ValueError(campaign_brief_prior_error_message(prior_json, milestone_id="scheduler"))

    reel_lineup_data = extract_reel_lineup_data(prior_json)
    if reel_lineup_data is None:
        raise ValueError(reel_lineup_prior_error_message(prior_json, milestone_id="scheduler"))

    post_lineup_data = extract_post_lineup_data(prior_json)
    story_lineup_data = extract_story_lineup_data(prior_json)

    dates_row = extract_dates_row(prior_json)
    source_dates_title = ""
    if isinstance(dates_row, dict):
        title = dates_row.get("title")
        if isinstance(title, str) and title.strip():
            source_dates_title = title.strip()

    campaign_brief_row = extract_restaurant_campaign_brief_row(prior_json)
    source_campaign_brief_title = ""
    if isinstance(campaign_brief_row, dict):
        brief_title = campaign_brief_row.get("title")
        if isinstance(brief_title, str) and brief_title.strip():
            source_campaign_brief_title = brief_title.strip()

    reel_lineup_row = extract_reel_lineup_row(prior_json)
    source_reel_lineup_title = ""
    if isinstance(reel_lineup_row, dict):
        reel_title = reel_lineup_row.get("title")
        if isinstance(reel_title, str) and reel_title.strip():
            source_reel_lineup_title = reel_title.strip()

    post_lineup_row = extract_post_lineup_row(prior_json)
    source_post_lineup_title = ""
    if isinstance(post_lineup_row, dict):
        post_title = post_lineup_row.get("title")
        if isinstance(post_title, str) and post_title.strip():
            source_post_lineup_title = post_title.strip()

    story_lineup_row = extract_story_lineup_row(prior_json)
    source_story_lineup_title = ""
    if isinstance(story_lineup_row, dict):
        story_title = story_lineup_row.get("title")
        if isinstance(story_title, str) and story_title.strip():
            source_story_lineup_title = story_title.strip()

    return {
        "dates_data": dates_data,
        "source_dates_title": source_dates_title,
        "campaign_brief_data": campaign_brief_data,
        "source_campaign_brief_title": source_campaign_brief_title,
        "reel_lineup_data": reel_lineup_data,
        "source_reel_lineup_title": source_reel_lineup_title,
        "post_lineup_data": post_lineup_data,
        "source_post_lineup_title": source_post_lineup_title,
        "story_lineup_data": story_lineup_data,
        "source_story_lineup_title": source_story_lineup_title,
    }


async def build_snapshot(state: SchedulerState) -> dict[str, Any]:
    dates_data = state.get("dates_data")
    if not isinstance(dates_data, dict):
        raise ValueError("scheduler requires prior dates milestone data")

    campaign_brief_data = state.get("campaign_brief_data")
    if not isinstance(campaign_brief_data, dict):
        raise ValueError("scheduler requires prior restaurant_campaign_brief milestone data")

    reel_lineup_data = state.get("reel_lineup_data")
    if not isinstance(reel_lineup_data, dict):
        raise ValueError("scheduler requires prior reel_lineup milestone data")

    start_date = str(dates_data.get("startDate") or "").strip()
    end_date = str(dates_data.get("endDate") or "").strip()
    if not start_date or not end_date:
        raise ValueError("scheduler requires prior dates milestone with startDate and endDate")

    public_holidays = dates_data.get("publicHolidays")
    if not isinstance(public_holidays, list):
        public_holidays = []

    slots = _build_reel_slots(
        reel_lineup_data,
        campaign_brief_data,
        start_date=start_date,
        end_date=end_date,
    )
    slots.extend(
        _build_post_slots(
            state.get("post_lineup_data"),
            start_date=start_date,
            end_date=end_date,
        )
    )
    slots.extend(
        _build_story_slots(
            state.get("story_lineup_data"),
            start_date=start_date,
            end_date=end_date,
        )
    )

    slots.sort(key=lambda slot: (slot["date"], slot["time"], slot["kind"], slot["title"]))

    payload: dict[str, Any] = {
        "startDate": start_date,
        "endDate": end_date,
        "publicHolidays": public_holidays,
        "slots": slots,
    }
    source_dates_title = str(state.get("source_dates_title") or "").strip()
    if source_dates_title:
        payload["sourceDatesTitle"] = source_dates_title
    source_campaign_brief_title = str(state.get("source_campaign_brief_title") or "").strip()
    if source_campaign_brief_title:
        payload["sourceCampaignBriefTitle"] = source_campaign_brief_title
    source_reel_lineup_title = str(state.get("source_reel_lineup_title") or "").strip()
    if source_reel_lineup_title:
        payload["sourceReelLineupTitle"] = source_reel_lineup_title
    source_post_lineup_title = str(state.get("source_post_lineup_title") or "").strip()
    if source_post_lineup_title:
        payload["sourcePostLineupTitle"] = source_post_lineup_title
    source_story_lineup_title = str(state.get("source_story_lineup_title") or "").strip()
    if source_story_lineup_title:
        payload["sourceStoryLineupTitle"] = source_story_lineup_title

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
