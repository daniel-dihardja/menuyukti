"""Campaign window week enumeration for milestone planning."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date, timedelta
from typing import Any, Literal

WeekdayName = Literal[
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
    "sunday",
]

_WEEKDAY_INDEX = {
    "monday": 0,
    "tuesday": 1,
    "wednesday": 2,
    "thursday": 3,
    "friday": 4,
    "saturday": 5,
    "sunday": 6,
}

_INDEX_WEEKDAY: dict[int, WeekdayName] = {
    0: "monday",
    1: "tuesday",
    2: "wednesday",
    3: "thursday",
    4: "friday",
    5: "saturday",
    6: "sunday",
}

_DEFAULT_WEEKDAY_LUNCH_DAYS: list[WeekdayName] = ["tuesday"]
_DEFAULT_WEEKLY_POST_TIME = "10:00"


def parse_iso_date(value: str) -> date | None:
    text = str(value or "").strip()
    if not text:
        return None
    try:
        return date.fromisoformat(text)
    except ValueError:
        return None


def _start_of_week_monday(value: date) -> date:
    weekday = value.weekday()
    return value - timedelta(days=weekday)


def _strategy_focus(campaign_brief_data: dict[str, Any] | None) -> str:
    if not isinstance(campaign_brief_data, dict):
        return "weekday_lunch"
    overall = campaign_brief_data.get("overallStrategy")
    if not isinstance(overall, dict):
        return "weekday_lunch"
    raw = str(overall.get("strategyFocus") or "").strip().lower()
    if not raw:
        return "weekday_lunch"
    normalized = "_".join(raw.replace("-", " ").split())
    if "weekend" in normalized:
        return "weekend_family"
    if "evening" in normalized or "dinner" in normalized:
        return "evening_dinner"
    return "weekday_lunch"


def preferred_weekdays_for_strategy(
    campaign_brief_data: dict[str, Any] | None,
) -> list[WeekdayName]:
    focus = _strategy_focus(campaign_brief_data)
    if focus == "weekend_family":
        return ["friday", "sunday"]
    if focus == "evening_dinner":
        return ["wednesday", "friday"]
    return list(_DEFAULT_WEEKDAY_LUNCH_DAYS)


def preferred_time_for_strategy(campaign_brief_data: dict[str, Any] | None) -> str:
    focus = _strategy_focus(campaign_brief_data)
    if focus == "weekend_family":
        return "09:30"
    if focus == "evening_dinner":
        return "17:30"
    return _DEFAULT_WEEKLY_POST_TIME


def weekday_name_from_date(value: date) -> WeekdayName:
    return _INDEX_WEEKDAY[value.weekday()]


@dataclass(frozen=True)
class CampaignWeek:
    week_index: int
    week_start: str
    week_end: str
    post_date: str


def _pick_post_date(
    week_start: date,
    week_end: date,
    window_start: date,
    window_end: date,
    preferred_weekdays: list[WeekdayName],
) -> str | None:
    preferred_indexes = [_WEEKDAY_INDEX[day] for day in preferred_weekdays if day in _WEEKDAY_INDEX]
    if not preferred_indexes:
        preferred_indexes = [_WEEKDAY_INDEX["tuesday"]]

    range_start = max(week_start, window_start)
    range_end = min(week_end, window_end)
    if range_start > range_end:
        return None

    cursor = range_start
    while cursor <= range_end:
        if cursor.weekday() in preferred_indexes:
            return cursor.isoformat()
        cursor += timedelta(days=1)
    return None


def campaign_weeks(
    start_date: str,
    end_date: str,
    *,
    campaign_brief_data: dict[str, Any] | None = None,
) -> list[CampaignWeek]:
    window_start = parse_iso_date(start_date)
    window_end = parse_iso_date(end_date)
    if window_start is None or window_end is None or window_start > window_end:
        return []

    preferred_weekdays = preferred_weekdays_for_strategy(campaign_brief_data)
    min_week = _start_of_week_monday(window_start)
    max_week = _start_of_week_monday(window_end)

    weeks: list[CampaignWeek] = []
    cursor = min_week
    week_index = 1
    while cursor <= max_week:
        week_start = cursor
        week_end = cursor + timedelta(days=6)
        post_date = _pick_post_date(
            week_start,
            week_end,
            window_start,
            window_end,
            preferred_weekdays,
        )
        if post_date is not None:
            weeks.append(
                CampaignWeek(
                    week_index=week_index,
                    week_start=week_start.isoformat(),
                    week_end=min(week_end, window_end).isoformat(),
                    post_date=post_date,
                )
            )
            week_index += 1
        cursor += timedelta(days=7)

    return weeks


def count_campaign_weeks(
    start_date: str,
    end_date: str,
    *,
    campaign_brief_data: dict[str, Any] | None = None,
) -> int:
    return len(
        campaign_weeks(
            start_date,
            end_date,
            campaign_brief_data=campaign_brief_data,
        )
    )
