"""Nodes for scheduler fetch, LLM schedule generation, and persistence."""

from __future__ import annotations

import json
from datetime import date
from typing import Any, Literal

import httpx
from agents_app.agents.core.llm_invoke import (
    STRUCTURED_OUTPUT_FAILED,
    LLMInvokeError,
    emit_llm_error_step,
)
from agents_app.agents.core.milestone_run.dates_window import campaign_weeks, interval_block_starts
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
    extract_post_lineup_data,
    extract_post_lineup_row,
    extract_reel_lineup_data,
    extract_reel_lineup_row,
    extract_restaurant_campaign_brief_data,
    extract_restaurant_campaign_brief_row,
    extract_story_lineup_data,
    extract_story_lineup_row,
)
from agents_app.agents.core.milestone_run.scheduler.prompts import format_scheduler_system
from agents_app.agents.core.milestone_run.scheduler.state import SchedulerOutput, SchedulerState
from langchain_core.messages import BaseMessage, HumanMessage, SystemMessage
from langgraph.config import get_stream_writer
from pydantic import BaseModel, Field

DEFAULT_POST_SLOT_TIME = "12:00"
DEFAULT_STORY_SLOT_TIME = "10:00"
DEFAULT_REEL_SLOT_TIME = "12:00"
SCHEDULER_MAX_ATTEMPTS = 3


class SchedulerDraftSlot(BaseModel):
    kind: Literal["story", "post", "reel"]
    date: str
    time: str
    title: str
    sourceId: str = Field(min_length=1)


class SchedulerDraftOutput(BaseModel):
    slots: list[SchedulerDraftSlot]


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


def _parse_time_range(value: str) -> tuple[str, str] | None:
    text = value.strip()
    if not text or "-" not in text:
        return None
    start, end = [part.strip() for part in text.split("-", 1)]
    if len(start) == 5 and len(end) == 5 and ":" in start and ":" in end:
        return start, end
    return None


def _is_weekday(iso_date: str) -> bool:
    parsed = _parse_iso_date(iso_date)
    return parsed is not None and parsed.weekday() < 5


def _is_weekend(iso_date: str) -> bool:
    parsed = _parse_iso_date(iso_date)
    return parsed is not None and parsed.weekday() >= 5


def _is_within_lunch_time(value: str, lunch_window: tuple[str, str]) -> bool:
    start, end = lunch_window
    return start <= value <= end


def _candidate_entries(lineup: dict[str, Any] | None, key: str) -> list[dict[str, Any]]:
    values = lineup.get(key) if isinstance(lineup, dict) else None
    if not isinstance(values, list):
        return []
    return [row for row in values if isinstance(row, dict)]


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


def _to_schedule_slot(
    draft: SchedulerDraftSlot,
    *,
    post_by_id: dict[str, dict[str, Any]],
    reel_by_id: dict[str, dict[str, Any]],
    story_by_id: dict[str, dict[str, Any]],
) -> dict[str, Any]:
    payload: dict[str, Any] = {
        "kind": draft.kind,
        "date": draft.date.strip(),
        "time": draft.time.strip(),
        "title": draft.title.strip(),
    }
    if draft.kind == "post":
        detail = _post_slot_detail(post_by_id.get(draft.sourceId, {}))
        if detail is not None:
            payload["post"] = detail
    elif draft.kind == "reel":
        detail = _reel_slot_detail(reel_by_id.get(draft.sourceId, {}))
        if detail is not None:
            payload["reel"] = detail
    elif draft.kind == "story":
        story = story_by_id.get(draft.sourceId, {})
        if not payload["title"]:
            payload["title"] = str(story.get("title") or "").strip()
    return payload


def _normalize_story_title(story: dict[str, Any]) -> str:
    return str(story.get("title") or "").strip()


def _weekly_block_index(iso_date: str, start_date: str, end_date: str) -> int | None:
    parsed = _parse_iso_date(iso_date)
    start = _parse_iso_date(start_date)
    end = _parse_iso_date(end_date)
    if parsed is None or start is None or end is None or parsed < start or parsed > end:
        return None
    for idx, (block_start, block_end) in enumerate(
        interval_block_starts(start_date, end_date, interval_weeks=4)
    ):
        if block_start <= iso_date <= block_end:
            return idx
    return None


def _build_generation_context(
    *,
    dates_data: dict[str, Any],
    campaign_brief_data: dict[str, Any],
    post_lineup_data: dict[str, Any] | None,
    reel_lineup_data: dict[str, Any] | None,
    story_lineup_data: dict[str, Any] | None,
    start_date: str,
    end_date: str,
) -> str:
    posts = _candidate_entries(post_lineup_data, "posts")
    reels = _candidate_entries(reel_lineup_data, "reels")
    stories = _candidate_entries(story_lineup_data, "stories")

    monthly_posts = [
        {"id": str(p.get("id") or "").strip(), "title": str(p.get("title") or "").strip()}
        for p in posts
        if str(p.get("intent") or "").strip() == "pinned_monthly_menu"
    ]
    weekday_posts = [
        {"id": str(p.get("id") or "").strip(), "title": str(p.get("title") or "").strip()}
        for p in posts
        if str(p.get("intent") or "").strip() == "weekday_lunch_post"
    ]
    weekday_reels = [
        {"id": str(r.get("id") or "").strip(), "title": str(r.get("title") or "").strip()}
        for r in reels
        if str(r.get("intent") or "").strip() == "weekday_reel"
    ]
    weekend_reels = [
        {"id": str(r.get("id") or "").strip(), "title": str(r.get("title") or "").strip()}
        for r in reels
        if str(r.get("intent") or "").strip() == "weekend_reel"
    ]
    fixed_stories = [
        {
            "id": str(s.get("id") or "").strip(),
            "title": _normalize_story_title(s),
            "date": str(s.get("date") or "").strip(),
            "time": str(s.get("time") or "").strip() or DEFAULT_STORY_SLOT_TIME,
        }
        for s in stories
        if s.get("fixdate") is True and str(s.get("date") or "").strip()
    ]
    feedback_stories = [
        {"id": str(s.get("id") or "").strip(), "title": _normalize_story_title(s)}
        for s in stories
        if str(s.get("reason") or "").strip() == "user_review"
    ]

    weeks = campaign_weeks(start_date, end_date, campaign_brief_data=campaign_brief_data)
    blocks = list(interval_block_starts(start_date, end_date, interval_weeks=4))

    brief_excerpt = {
        "overallStrategy": campaign_brief_data.get("overallStrategy"),
        "messageHierarchy": campaign_brief_data.get("messageHierarchy"),
        "offerAndCtaPlan": campaign_brief_data.get("offerAndCtaPlan"),
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
            "fourWeekBlocks": [
                {"index": idx + 1, "startDate": b_start, "endDate": b_end}
                for idx, (b_start, b_end) in enumerate(blocks)
            ],
            "publicHolidays": dates_data.get("publicHolidays") if isinstance(dates_data.get("publicHolidays"), list) else [],
        },
        "candidates": {
            "monthlyMenuPosts": monthly_posts,
            "weekdayPosts": weekday_posts,
            "weekdayReels": weekday_reels,
            "weekendReels": weekend_reels,
            "fixedDateStories": fixed_stories,
            "userFeedbackStories": feedback_stories,
        },
        "campaignBriefExcerpt": brief_excerpt,
    }

    return (
        "Generate schedule slots using ONLY candidate sourceId values from this input.\n"
        "Return one object with key `slots` where each item has: kind, date, time, title, sourceId.\n\n"
        f"```json\n{json.dumps(context_payload, ensure_ascii=False, indent=2)}\n```"
    )


def _scheduler_correction_message(error: str) -> HumanMessage:
    return HumanMessage(
        content=(
            "Your previous output was invalid. Return a corrected JSON object only with key `slots`.\n"
            f"Validation error: {error[:1200]}\n"
            "Each slot item must include: kind, date, time, title, sourceId."
        )
    )


def _validate_scheduler_rules(
    slots: list[SchedulerDraftSlot],
    *,
    start_date: str,
    end_date: str,
    campaign_brief_data: dict[str, Any],
    monthly_post_ids: set[str],
    weekday_post_ids: set[str],
    weekday_reel_ids: set[str],
    weekend_reel_ids: set[str],
    fixed_story_by_id: dict[str, tuple[str, str]],
    feedback_story_ids: set[str],
) -> None:
    weeks = campaign_weeks(start_date, end_date, campaign_brief_data=campaign_brief_data)
    if not weeks:
        raise ValueError("scheduler requires at least one campaign week")

    lunch_window = ("11:00", "14:00")
    offer_window = (
        campaign_brief_data.get("overallStrategy", {}).get("offerWindow")
        if isinstance(campaign_brief_data.get("overallStrategy"), dict)
        else None
    )
    if isinstance(offer_window, str):
        parsed = _parse_time_range(offer_window)
        if parsed is not None:
            lunch_window = parsed

    monthlies_by_block: dict[int, int] = {}
    feedback_by_block: dict[int, int] = {}
    weekday_posts_by_week: dict[str, int] = {week.week_start: 0 for week in weeks}
    weekday_reels_by_week: dict[str, int] = {week.week_start: 0 for week in weeks}
    fixed_story_hits: dict[str, int] = {story_id: 0 for story_id in fixed_story_by_id}

    for slot in slots:
        iso_date = slot.date.strip()
        slot_time = slot.time.strip()
        source_id = slot.sourceId.strip()
        if _parse_iso_date(iso_date) is None:
            raise ValueError(f"invalid slot date: {iso_date}")
        if iso_date < start_date or iso_date > end_date:
            raise ValueError(f"slot date {iso_date} is outside campaign window")

        week = next((row for row in weeks if row.week_start <= iso_date <= row.week_end), None)
        if week is None:
            raise ValueError(f"slot date {iso_date} does not map to a campaign week")

        if slot.kind == "post":
            if source_id in monthly_post_ids:
                block_index = _weekly_block_index(iso_date, start_date, end_date)
                if block_index is None:
                    raise ValueError(f"monthly post slot {iso_date} is outside 4-week blocks")
                monthlies_by_block[block_index] = monthlies_by_block.get(block_index, 0) + 1
            elif source_id in weekday_post_ids:
                if not _is_weekday(iso_date):
                    raise ValueError(f"weekday post must be on weekday: {iso_date}")
                if not _is_within_lunch_time(slot_time, lunch_window):
                    raise ValueError(f"weekday post must be during lunch time: {slot_time}")
                weekday_posts_by_week[week.week_start] = weekday_posts_by_week.get(week.week_start, 0) + 1
            else:
                raise ValueError(f"post sourceId not found in post lineup candidates: {source_id}")

        elif slot.kind == "reel":
            if source_id in weekday_reel_ids:
                if not _is_weekday(iso_date):
                    raise ValueError(f"weekday reel must be on weekday: {iso_date}")
                if not _is_within_lunch_time(slot_time, lunch_window):
                    raise ValueError(f"weekday reel must be during lunch time: {slot_time}")
                weekday_reels_by_week[week.week_start] = weekday_reels_by_week.get(week.week_start, 0) + 1
            elif source_id in weekend_reel_ids:
                if not _is_weekend(iso_date):
                    raise ValueError(f"weekend reel must be on weekend: {iso_date}")
            else:
                raise ValueError(f"reel sourceId not found in reel lineup candidates: {source_id}")

        else:
            if source_id in fixed_story_by_id:
                expected_date, _expected_time = fixed_story_by_id[source_id]
                if iso_date != expected_date:
                    raise ValueError(
                        f"fixed-date story {source_id} must be on {expected_date}, got {iso_date}"
                    )
                fixed_story_hits[source_id] = fixed_story_hits.get(source_id, 0) + 1
            elif source_id in feedback_story_ids:
                block_index = _weekly_block_index(iso_date, start_date, end_date)
                if block_index is None:
                    raise ValueError(f"feedback story slot {iso_date} is outside 4-week blocks")
                feedback_by_block[block_index] = feedback_by_block.get(block_index, 0) + 1
            else:
                raise ValueError(f"story sourceId not found in story lineup candidates: {source_id}")

    total_blocks = len(list(interval_block_starts(start_date, end_date, interval_weeks=4)))
    for block_index in range(total_blocks):
        if monthlies_by_block.get(block_index, 0) != 1:
            raise ValueError(f"monthly menu pin post must be exactly 1 in 4-week block {block_index + 1}")
        if feedback_by_block.get(block_index, 0) != 1:
            raise ValueError(
                "positive user feedback story must be exactly 1 in "
                f"4-week block {block_index + 1}"
            )

    for week in weeks:
        if weekday_posts_by_week.get(week.week_start, 0) != 1:
            raise ValueError(f"weekday post must be exactly 1 in campaign week {week.week_index}")
        if weekday_reels_by_week.get(week.week_start, 0) != 1:
            raise ValueError(f"weekday reel must be exactly 1 in campaign week {week.week_index}")

    for story_id, hit_count in fixed_story_hits.items():
        if hit_count != 1:
            raise ValueError(f"fixed-date story {story_id} must be scheduled exactly once")


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

    post_candidates = _candidate_entries(state.get("post_lineup_data"), "posts")
    reel_candidates = _candidate_entries(state.get("reel_lineup_data"), "reels")
    story_candidates = _candidate_entries(state.get("story_lineup_data"), "stories")

    post_by_id = {str(item.get("id") or "").strip(): item for item in post_candidates if str(item.get("id") or "").strip()}
    reel_by_id = {str(item.get("id") or "").strip(): item for item in reel_candidates if str(item.get("id") or "").strip()}
    story_by_id = {str(item.get("id") or "").strip(): item for item in story_candidates if str(item.get("id") or "").strip()}

    monthly_post_ids = {
        row_id
        for row_id, item in post_by_id.items()
        if str(item.get("intent") or "").strip() == "pinned_monthly_menu"
    }
    weekday_post_ids = {
        row_id
        for row_id, item in post_by_id.items()
        if str(item.get("intent") or "").strip() == "weekday_lunch_post"
    }
    weekday_reel_ids = {
        row_id
        for row_id, item in reel_by_id.items()
        if str(item.get("intent") or "").strip() == "weekday_reel"
    }
    weekend_reel_ids = {
        row_id
        for row_id, item in reel_by_id.items()
        if str(item.get("intent") or "").strip() == "weekend_reel"
    }
    fixed_story_by_id = {
        row_id: (
            str(item.get("date") or "").strip(),
            str(item.get("time") or "").strip() or DEFAULT_STORY_SLOT_TIME,
        )
        for row_id, item in story_by_id.items()
        if item.get("fixdate") is True and str(item.get("date") or "").strip()
    }
    feedback_story_ids = {
        row_id
        for row_id, item in story_by_id.items()
        if str(item.get("reason") or "").strip() == "user_review"
    }

    generation_context = _build_generation_context(
        dates_data=dates_data,
        campaign_brief_data=campaign_brief_data,
        post_lineup_data=state.get("post_lineup_data"),
        reel_lineup_data=state.get("reel_lineup_data"),
        story_lineup_data=state.get("story_lineup_data"),
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
                monthly_post_ids=monthly_post_ids,
                weekday_post_ids=weekday_post_ids,
                weekday_reel_ids=weekday_reel_ids,
                weekend_reel_ids=weekend_reel_ids,
                fixed_story_by_id=fixed_story_by_id,
                feedback_story_ids=feedback_story_ids,
            )
            schedule_slots = [
                _to_schedule_slot(
                    slot,
                    post_by_id=post_by_id,
                    reel_by_id=reel_by_id,
                    story_by_id=story_by_id,
                )
                for slot in generated.slots
            ]
            schedule_slots.sort(
                key=lambda slot: (
                    str(slot.get("date") or ""),
                    str(slot.get("time") or ""),
                    str(slot.get("kind") or ""),
                    str(slot.get("title") or ""),
                )
            )

            payload: dict[str, Any] = {
                "startDate": start_date,
                "endDate": end_date,
                "publicHolidays": public_holidays,
                "slots": schedule_slots,
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
            _trace_agent_event(state, "chat_model_end")
            return {"generated_output": normalized}
        except ValueError as exc:
            retry_error = str(exc)
            if attempt >= SCHEDULER_MAX_ATTEMPTS:
                _trace_agent_event(state, "chat_model_end")
                raise ValueError(f"scheduler planning failed after {attempt} attempts: {exc}") from exc

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
