"""Nodes for scheduler fetch, snapshot, and persistence."""

from __future__ import annotations

import json
from datetime import date
from typing import Any

import httpx
from agents_app.agents.core.milestone_run.dates_window import (
    campaign_weeks,
    holiday_dates,
    interval_block_starts,
    pick_least_busy_date,
    preferred_reel_time_for_strategy,
    preferred_time_for_strategy,
    preferred_weekdays_for_strategy,
)
from agents_app.agents.core.milestone_run.graphql_client import upsert_milestonedata_node
from agents_app.agents.core.milestone_run.output_schema import validate_skill_output
from agents_app.agents.core.milestone_run.post_lineup.build import POST_LINEUP_WEEKLY_POST_ID_PREFIX
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
)
from agents_app.agents.core.milestone_run.reel_lineup.build import (
    REEL_LINEUP_WEEKDAY_REEL_ID_PREFIX,
    REEL_LINEUP_WEEKEND_REEL_ID_PREFIX,
)
from agents_app.agents.core.milestone_run.scheduler.state import SchedulerOutput, SchedulerState
from langgraph.config import get_stream_writer

DEFAULT_POST_SLOT_TIME = "10:00"
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


def _parse_iso_date(value: str) -> date | None:
    text = value.strip()
    if not text:
        return None
    try:
        return date.fromisoformat(text)
    except ValueError:
        return None


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


def _post_slot_detail(post: dict[str, Any]) -> dict[str, Any] | None:
    post_id = str(post.get("id") or "").strip()
    title = str(post.get("title") or "").strip()
    intent = str(post.get("intent") or "").strip()
    post_format = str(post.get("format") or "").strip()
    if not post_id or not title or intent not in {"pinned_monthly_menu", "weekday_lunch_post"}:
        return None
    if post_format != "carousel":
        return None

    raw_slides = post.get("slides")
    if not isinstance(raw_slides, list) or not raw_slides:
        return None

    slides: list[dict[str, Any]] = []
    for slide in raw_slides:
        if not isinstance(slide, dict):
            continue
        dish_name = str(slide.get("dishName") or "").strip()
        image_brief = str(slide.get("imageBrief") or "").strip()
        if not dish_name or not image_brief:
            continue
        slide_payload: dict[str, Any] = {
            "dishName": dish_name,
            "imageBrief": image_brief,
        }
        role = slide.get("role")
        if role in {"star", "puzzle"}:
            slide_payload["role"] = role
        category = slide.get("category")
        if isinstance(category, str) and category.strip():
            slide_payload["category"] = category.strip()
        slides.append(slide_payload)

    if not slides:
        return None

    raw_group_ids = post.get("groupIds")
    group_ids: list[str] = []
    if isinstance(raw_group_ids, list):
        group_ids = [str(value).strip() for value in raw_group_ids if str(value).strip()]

    payload: dict[str, Any] = {
        "id": post_id,
        "format": "carousel",
        "intent": intent,
        "title": title,
        "slides": slides,
        "groupIds": group_ids,
    }
    description = str(post.get("description") or "").strip()
    if description:
        payload["description"] = description
    caption_guidance = str(post.get("captionGuidance") or "").strip()
    if caption_guidance:
        payload["captionGuidance"] = caption_guidance
    return payload


def _post_slot_payload(
    post: dict[str, Any],
    *,
    iso_date: str,
    preferred_time: str,
) -> dict[str, Any] | None:
    title = str(post.get("title") or "").strip()
    if not title:
        return None
    payload: dict[str, Any] = {
        "kind": "post",
        "date": iso_date,
        "time": preferred_time,
        "title": title,
    }
    post_detail = _post_slot_detail(post)
    if post_detail is not None:
        payload["post"] = post_detail
    return payload


def _build_monthly_post_slots(
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
        if isinstance(post, dict)
        and str(post.get("intent") or "").strip() == "pinned_monthly_menu"
        and str(post.get("title") or "").strip()
    ]
    if not valid_posts:
        return []

    dates = _first_of_month_dates(start_date, end_date)
    slots: list[dict[str, str]] = []
    for index, iso_date in enumerate(dates):
        post = valid_posts[index % len(valid_posts)]
        slot = _post_slot_payload(post, iso_date=iso_date, preferred_time=DEFAULT_POST_SLOT_TIME)
        if slot is not None:
            slots.append(slot)
    return slots


def _week_start_from_post_id(post: dict[str, Any]) -> str | None:
    post_id = str(post.get("id") or "").strip()
    prefix = f"{POST_LINEUP_WEEKLY_POST_ID_PREFIX}-"
    if not post_id.startswith(prefix):
        return None
    week_start = post_id[len(prefix) :]
    return week_start if _parse_iso_date(week_start) is not None else None


def _build_weekly_post_slots(
    post_lineup_data: dict[str, Any] | None,
    *,
    campaign_brief_data: dict[str, Any] | None,
    start_date: str,
    end_date: str,
) -> list[dict[str, str]]:
    posts = post_lineup_data.get("posts") if isinstance(post_lineup_data, dict) else None
    if not isinstance(posts, list):
        return []

    valid_posts = [
        post
        for post in posts
        if isinstance(post, dict)
        and str(post.get("intent") or "").strip() == "weekday_lunch_post"
        and str(post.get("title") or "").strip()
    ]
    if not valid_posts:
        return []

    fixdated_posts = [
        post
        for post in valid_posts
        if post.get("fixdate") is True and str(post.get("date") or "").strip()
    ]
    slots: list[dict[str, str]] = []
    if fixdated_posts:
        for post in fixdated_posts:
            iso_date = str(post.get("date") or "").strip()
            if iso_date < start_date or iso_date > end_date:
                continue
            hints = post.get("scheduleHints")
            preferred_time = DEFAULT_POST_SLOT_TIME
            if isinstance(hints, dict):
                time = str(hints.get("preferredTime") or "").strip()
                if time:
                    preferred_time = time
            slots.append(
                _post_slot_payload(post, iso_date=iso_date, preferred_time=preferred_time)
                or {
                    "kind": "post",
                    "date": iso_date,
                    "time": preferred_time,
                    "title": str(post.get("title") or "").strip(),
                }
            )
        return slots

    weeks = campaign_weeks(start_date, end_date, campaign_brief_data=campaign_brief_data)
    preferred_time = preferred_time_for_strategy(campaign_brief_data)
    posts_by_week: dict[str, dict[str, Any]] = {}
    unmatched: list[dict[str, Any]] = []
    for post in valid_posts:
        week_start = _week_start_from_post_id(post)
        if week_start is not None and week_start not in posts_by_week:
            posts_by_week[week_start] = post
        else:
            unmatched.append(post)

    for week in weeks:
        week_post: dict[str, Any] | None = posts_by_week.get(week.week_start)
        if week_post is None and unmatched:
            week_post = unmatched.pop(0)
        if week_post is None:
            continue
        iso_date = week.post_date
        if iso_date < start_date or iso_date > end_date:
            continue
        slot = _post_slot_payload(week_post, iso_date=iso_date, preferred_time=preferred_time)
        if slot is not None:
            slots.append(slot)
    return slots


def _build_post_slots(
    post_lineup_data: dict[str, Any] | None,
    *,
    campaign_brief_data: dict[str, Any] | None,
    start_date: str,
    end_date: str,
) -> list[dict[str, str]]:
    slots: list[dict[str, str]] = []
    slots.extend(
        _build_monthly_post_slots(
            post_lineup_data,
            start_date=start_date,
            end_date=end_date,
        )
    )
    slots.extend(
        _build_weekly_post_slots(
            post_lineup_data,
            campaign_brief_data=campaign_brief_data,
            start_date=start_date,
            end_date=end_date,
        )
    )
    return slots


def _slot_counts(slots: list[dict[str, str]]) -> dict[str, int]:
    counts: dict[str, int] = {}
    for slot in slots:
        iso_date = str(slot.get("date") or "").strip()
        if iso_date:
            counts[iso_date] = counts.get(iso_date, 0) + 1
    return counts


def _build_fixdate_story_slots(
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
        if story.get("fixdate") is not True:
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


def _build_interval_story_slots(
    story_lineup_data: dict[str, Any] | None,
    *,
    start_date: str,
    end_date: str,
    public_holidays: list[Any],
    existing_slots: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    stories = story_lineup_data.get("stories") if isinstance(story_lineup_data, dict) else None
    if not isinstance(stories, list):
        return []

    holidays = holiday_dates(public_holidays)
    occupied_counts = _slot_counts(existing_slots)
    slots: list[dict[str, str]] = []

    for story in stories:
        if not isinstance(story, dict):
            continue
        if story.get("fixdate") is True:
            continue
        if str(story.get("reason") or "").strip() != "user_review":
            continue
        title = str(story.get("title") or "").strip()
        if not title:
            continue

        raw_interval = story.get("intervalWeeks")
        interval_weeks = 4
        if isinstance(raw_interval, int) and raw_interval > 0:
            interval_weeks = raw_interval
        elif isinstance(raw_interval, float) and raw_interval > 0:
            interval_weeks = int(raw_interval)

        time = str(story.get("time") or "").strip() or DEFAULT_STORY_SLOT_TIME
        for block_start, block_end in interval_block_starts(
            start_date,
            end_date,
            interval_weeks=interval_weeks,
        ):
            iso_date = pick_least_busy_date(
                block_start,
                block_end,
                occupied_counts=occupied_counts,
                holiday_dates=holidays,
            )
            if iso_date is None:
                continue
            slots.append(
                {
                    "kind": "story",
                    "date": iso_date,
                    "time": time,
                    "title": title,
                }
            )
            occupied_counts[iso_date] = occupied_counts.get(iso_date, 0) + 1

    return slots


def _build_story_slots(
    story_lineup_data: dict[str, Any] | None,
    *,
    start_date: str,
    end_date: str,
    public_holidays: list[Any],
    existing_slots: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    fixdate_slots = _build_fixdate_story_slots(
        story_lineup_data,
        start_date=start_date,
        end_date=end_date,
    )
    interval_slots = _build_interval_story_slots(
        story_lineup_data,
        start_date=start_date,
        end_date=end_date,
        public_holidays=public_holidays,
        existing_slots=[*existing_slots, *fixdate_slots],
    )
    return [*fixdate_slots, *interval_slots]


def _week_start_from_reel_id(reel: dict[str, Any], *, prefix: str) -> str | None:
    reel_id = str(reel.get("id") or "").strip()
    if not reel_id.startswith(prefix):
        return None
    week_start = reel_id[len(prefix) :]
    return week_start if _parse_iso_date(week_start) is not None else None


def _reel_slot_detail(reel: dict[str, Any]) -> dict[str, Any] | None:
    reel_id = str(reel.get("id") or "").strip()
    title = str(reel.get("title") or "").strip()
    intent = str(reel.get("intent") or "").strip()
    post_format = str(reel.get("format") or "").strip()
    description = str(reel.get("description") or "").strip()
    explanation = str(reel.get("explanation") or "").strip()
    if (
        not reel_id
        or not title
        or intent not in {"weekday_reel", "weekend_reel"}
        or post_format != "reel"
        or not description
        or not explanation
    ):
        return None

    raw_group_ids = reel.get("groupIds")
    group_ids: list[str] = []
    if isinstance(raw_group_ids, list):
        group_ids = [str(value).strip() for value in raw_group_ids if str(value).strip()]
    if not group_ids:
        return None

    hero_dishes: list[dict[str, Any]] = []
    raw_hero_dishes = reel.get("heroDishes")
    if isinstance(raw_hero_dishes, list):
        for dish in raw_hero_dishes:
            if not isinstance(dish, dict):
                continue
            name = str(dish.get("name") or "").strip()
            if not name:
                continue
            dish_payload: dict[str, Any] = {"name": name}
            reel_moment = str(dish.get("reelMoment") or "").strip()
            if reel_moment:
                dish_payload["reelMoment"] = reel_moment
            role = dish.get("role")
            if role in {"star", "puzzle"}:
                dish_payload["role"] = role
            hero_dishes.append(dish_payload)

    payload: dict[str, Any] = {
        "id": reel_id,
        "format": "reel",
        "intent": intent,
        "title": title,
        "description": description,
        "explanation": explanation,
        "groupIds": group_ids,
    }
    if hero_dishes:
        payload["heroDishes"] = hero_dishes
    return payload


def _reel_slot_payload(
    reel: dict[str, Any],
    *,
    iso_date: str,
    preferred_time: str,
) -> dict[str, Any] | None:
    title = str(reel.get("title") or "").strip()
    if not title:
        return None
    payload: dict[str, Any] = {
        "kind": "reel",
        "date": iso_date,
        "time": preferred_time,
        "title": f"Reel: {title}",
    }
    reel_detail = _reel_slot_detail(reel)
    if reel_detail is not None:
        payload["reel"] = reel_detail
    return payload


def _build_reel_slots(
    reel_lineup_data: dict[str, Any] | None,
    *,
    campaign_brief_data: dict[str, Any] | None,
    start_date: str,
    end_date: str,
    public_holidays: list[Any],
    existing_slots: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    reels = reel_lineup_data.get("reels") if isinstance(reel_lineup_data, dict) else None
    if not isinstance(reels, list) or not reels:
        return []

    valid_reels = [
        reel
        for reel in reels
        if isinstance(reel, dict)
        and str(reel.get("intent") or "").strip() in {"weekday_reel", "weekend_reel"}
        and str(reel.get("title") or "").strip()
    ]
    if not valid_reels:
        return []

    weeks = campaign_weeks(start_date, end_date, campaign_brief_data=campaign_brief_data)
    if not weeks:
        return []

    holidays = holiday_dates(public_holidays)
    occupied_counts = _slot_counts(existing_slots)
    weekday_preferred = preferred_weekdays_for_strategy(campaign_brief_data)
    weekend_preferred: list[str] = ["saturday", "sunday"]
    preferred_time = preferred_reel_time_for_strategy(campaign_brief_data)

    weekday_by_week: dict[str, dict[str, Any]] = {}
    weekend_by_week: dict[str, dict[str, Any]] = {}
    unmatched_weekday: list[dict[str, Any]] = []
    unmatched_weekend: list[dict[str, Any]] = []

    for reel in valid_reels:
        intent = str(reel.get("intent") or "").strip()
        if intent == "weekday_reel":
            week_start = _week_start_from_reel_id(
                reel,
                prefix=REEL_LINEUP_WEEKDAY_REEL_ID_PREFIX,
            )
            if week_start is not None and week_start not in weekday_by_week:
                weekday_by_week[week_start] = reel
            else:
                unmatched_weekday.append(reel)
        else:
            week_start = _week_start_from_reel_id(
                reel,
                prefix=REEL_LINEUP_WEEKEND_REEL_ID_PREFIX,
            )
            if week_start is not None and week_start not in weekend_by_week:
                weekend_by_week[week_start] = reel
            else:
                unmatched_weekend.append(reel)

    slots: list[dict[str, Any]] = []
    for week in weeks:
        week_reel: dict[str, Any] | None = weekday_by_week.get(week.week_start)
        if week_reel is None and unmatched_weekday:
            week_reel = unmatched_weekday.pop(0)
        if week_reel is not None:
            iso_date = pick_least_busy_date(
                week.week_start,
                week.week_end,
                occupied_counts=occupied_counts,
                holiday_dates=holidays,
                preferred_weekdays=weekday_preferred,
            )
            if iso_date is not None and start_date <= iso_date <= end_date:
                slot = _reel_slot_payload(
                    week_reel,
                    iso_date=iso_date,
                    preferred_time=preferred_time,
                )
                if slot is not None:
                    slots.append(slot)
                    occupied_counts[iso_date] = occupied_counts.get(iso_date, 0) + 1

        weekend_reel: dict[str, Any] | None = weekend_by_week.get(week.week_start)
        if weekend_reel is None and unmatched_weekend:
            weekend_reel = unmatched_weekend.pop(0)
        if weekend_reel is not None:
            iso_date = pick_least_busy_date(
                week.week_start,
                week.week_end,
                occupied_counts=occupied_counts,
                holiday_dates=holidays,
                preferred_weekdays=weekend_preferred,
            )
            if iso_date is not None and start_date <= iso_date <= end_date:
                slot = _reel_slot_payload(
                    weekend_reel,
                    iso_date=iso_date,
                    preferred_time=preferred_time,
                )
                if slot is not None:
                    slots.append(slot)
                    occupied_counts[iso_date] = occupied_counts.get(iso_date, 0) + 1

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

    post_lineup_data = extract_post_lineup_data(prior_json)
    story_lineup_data = extract_story_lineup_data(prior_json)
    reel_lineup_data = extract_reel_lineup_data(prior_json)

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

    reel_lineup_row = extract_reel_lineup_row(prior_json)
    source_reel_lineup_title = ""
    if isinstance(reel_lineup_row, dict):
        reel_title = reel_lineup_row.get("title")
        if isinstance(reel_title, str) and reel_title.strip():
            source_reel_lineup_title = reel_title.strip()

    return {
        "dates_data": dates_data,
        "source_dates_title": source_dates_title,
        "campaign_brief_data": campaign_brief_data,
        "source_campaign_brief_title": source_campaign_brief_title,
        "post_lineup_data": post_lineup_data,
        "source_post_lineup_title": source_post_lineup_title,
        "story_lineup_data": story_lineup_data,
        "source_story_lineup_title": source_story_lineup_title,
        "reel_lineup_data": reel_lineup_data,
        "source_reel_lineup_title": source_reel_lineup_title,
    }


async def build_snapshot(state: SchedulerState) -> dict[str, Any]:
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

    slots: list[dict[str, str]] = []
    post_slots = _build_post_slots(
        state.get("post_lineup_data"),
        campaign_brief_data=campaign_brief_data,
        start_date=start_date,
        end_date=end_date,
    )
    slots.extend(post_slots)
    reel_slots = _build_reel_slots(
        state.get("reel_lineup_data"),
        campaign_brief_data=campaign_brief_data,
        start_date=start_date,
        end_date=end_date,
        public_holidays=public_holidays,
        existing_slots=post_slots,
    )
    slots.extend(reel_slots)
    slots.extend(
        _build_story_slots(
            state.get("story_lineup_data"),
            start_date=start_date,
            end_date=end_date,
            public_holidays=public_holidays,
            existing_slots=[*post_slots, *reel_slots],
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
    source_post_lineup_title = str(state.get("source_post_lineup_title") or "").strip()
    if source_post_lineup_title:
        payload["sourcePostLineupTitle"] = source_post_lineup_title
    source_story_lineup_title = str(state.get("source_story_lineup_title") or "").strip()
    if source_story_lineup_title:
        payload["sourceStoryLineupTitle"] = source_story_lineup_title
    source_reel_lineup_title = str(state.get("source_reel_lineup_title") or "").strip()
    if source_reel_lineup_title:
        payload["sourceReelLineupTitle"] = source_reel_lineup_title

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
