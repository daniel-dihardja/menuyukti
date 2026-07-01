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

_DEFAULT_WEEKDAY_LUNCH_DAYS: list[WeekdayName] = ["thursday"]
_DEFAULT_WEEKLY_POST_TIME = "10:00"
_DEFAULT_REEL_TIME = "11:00"


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


def preferred_reel_time_for_strategy(campaign_brief_data: dict[str, Any] | None) -> str:
    focus = _strategy_focus(campaign_brief_data)
    if focus == "weekend_family":
        return "09:30"
    if focus == "evening_dinner":
        return "17:30"
    return _DEFAULT_REEL_TIME


def preferred_weekdays_for_reel_intent(
    intent: Literal["weekday_reel", "weekend_reel"],
    campaign_brief_data: dict[str, Any] | None,
) -> list[WeekdayName]:
    if intent == "weekend_reel":
        focus = _strategy_focus(campaign_brief_data)
        if focus == "weekend_family":
            return ["friday", "sunday"]
        return ["saturday", "sunday"]
    return preferred_weekdays_for_strategy(campaign_brief_data)


def schedule_hints_for_reel_intent(
    intent: Literal["weekday_reel", "weekend_reel"],
    campaign_brief_data: dict[str, Any] | None,
) -> dict[str, Any]:
    return {
        "preferredWeekdays": preferred_weekdays_for_reel_intent(intent, campaign_brief_data),
        "preferredTime": preferred_reel_time_for_strategy(campaign_brief_data),
    }


def weekday_name_from_date(value: date) -> WeekdayName:
    return _INDEX_WEEKDAY[value.weekday()]


@dataclass(frozen=True)
class CampaignWeek:
    week_index: int
    week_start: str
    week_end: str
    post_date: str


# Campaign weeks with fewer in-window days are optional for weekly post/reel cadence
# (e.g. a 2-day tail at the end of the window).
MIN_SCHEDULABLE_WEEK_DAYS = 3

# Scheduler cadence: one top_five_category post every N weeks (rotating); user_review stories stay 4-week.
TOP_FIVE_CATEGORY_INTERVAL_WEEKS = 2
USER_REVIEW_STORY_INTERVAL_WEEKS = 4


def campaign_days_in_week_overlap(
    week_start: str,
    week_end: str,
    window_start: str,
    window_end: str,
) -> int:
    """Count calendar days where the campaign week overlaps the campaign window."""
    week_start_date = parse_iso_date(week_start)
    week_end_date = parse_iso_date(week_end)
    window_start_date = parse_iso_date(window_start)
    window_end_date = parse_iso_date(window_end)
    if (
        week_start_date is None
        or week_end_date is None
        or window_start_date is None
        or window_end_date is None
    ):
        return 0

    overlap_start = max(week_start_date, window_start_date)
    overlap_end = min(week_end_date, window_end_date)
    if overlap_start > overlap_end:
        return 0
    return (overlap_end - overlap_start).days + 1


def week_requires_weekly_cadence(
    week_start: str,
    week_end: str,
    window_start: str,
    window_end: str,
    *,
    min_days: int = MIN_SCHEDULABLE_WEEK_DAYS,
) -> bool:
    return campaign_days_in_week_overlap(week_start, week_end, window_start, window_end) >= min_days


def week_has_weekday_in_overlap(
    week_start: str,
    week_end: str,
    window_start: str,
    window_end: str,
) -> bool:
    week_start_date = parse_iso_date(week_start)
    week_end_date = parse_iso_date(week_end)
    window_start_date = parse_iso_date(window_start)
    window_end_date = parse_iso_date(window_end)
    if (
        week_start_date is None
        or week_end_date is None
        or window_start_date is None
        or window_end_date is None
    ):
        return False

    overlap_start = max(week_start_date, window_start_date)
    overlap_end = min(week_end_date, window_end_date)
    cursor = overlap_start
    while cursor <= overlap_end:
        if cursor.weekday() < 5:
            return True
        cursor += timedelta(days=1)
    return False


def week_has_weekend_in_overlap(
    week_start: str,
    week_end: str,
    window_start: str,
    window_end: str,
) -> bool:
    week_start_date = parse_iso_date(week_start)
    week_end_date = parse_iso_date(week_end)
    window_start_date = parse_iso_date(window_start)
    window_end_date = parse_iso_date(window_end)
    if (
        week_start_date is None
        or week_end_date is None
        or window_start_date is None
        or window_end_date is None
    ):
        return False

    overlap_start = max(week_start_date, window_start_date)
    overlap_end = min(week_end_date, window_end_date)
    cursor = overlap_start
    while cursor <= overlap_end:
        if cursor.weekday() >= 5:
            return True
        cursor += timedelta(days=1)
    return False


def _pick_post_date(
    week_start: date,
    week_end: date,
    window_start: date,
    window_end: date,
    preferred_weekdays: list[WeekdayName],
) -> str | None:
    preferred_indexes = [_WEEKDAY_INDEX[day] for day in preferred_weekdays if day in _WEEKDAY_INDEX]
    if not preferred_indexes:
        preferred_indexes = [_WEEKDAY_INDEX["thursday"]]

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


_USER_REVIEW_PREFERRED_WEEKDAYS: list[WeekdayName] = [
    "wednesday",
    "tuesday",
    "friday",
    "thursday",
    "monday",
]


def holiday_dates(public_holidays: list[Any]) -> set[str]:
    dates: set[str] = set()
    for holiday in public_holidays:
        if not isinstance(holiday, dict):
            continue
        parsed = parse_iso_date(str(holiday.get("date") or ""))
        if parsed is not None:
            dates.add(parsed.isoformat())
    return dates


def pick_least_busy_date(
    block_start: str,
    block_end: str,
    *,
    occupied_counts: dict[str, int],
    holiday_dates: set[str],
    preferred_weekdays: list[WeekdayName] | None = None,
) -> str | None:
    start = parse_iso_date(block_start)
    end = parse_iso_date(block_end)
    if start is None or end is None or start > end:
        return None

    weekdays = preferred_weekdays or list(_USER_REVIEW_PREFERRED_WEEKDAYS)
    preferred_indexes = {_WEEKDAY_INDEX[day] for day in weekdays if day in _WEEKDAY_INDEX}

    def _score(iso_date: str, weekday_index: int) -> tuple[int, int, str]:
        weekday_rank = (
            weekdays.index(_INDEX_WEEKDAY[weekday_index])
            if weekday_index in preferred_indexes
            else len(weekdays)
        )
        return (weekday_rank, occupied_counts.get(iso_date, 0), iso_date)

    candidates: list[tuple[tuple[int, int, str], str]] = []
    cursor = start
    while cursor <= end:
        iso = cursor.isoformat()
        if iso not in holiday_dates:
            candidates.append((_score(iso, cursor.weekday()), iso))
        cursor += timedelta(days=1)

    if not candidates:
        return None

    candidates.sort(key=lambda item: item[0])
    return candidates[0][1]


def interval_block_starts(
    start_date: str,
    end_date: str,
    *,
    interval_weeks: int,
) -> list[tuple[str, str]]:
    """Return (block_start, block_end) ISO date pairs for non-overlapping interval blocks."""
    if interval_weeks < 1:
        return []

    window_start = parse_iso_date(start_date)
    window_end = parse_iso_date(end_date)
    if window_start is None or window_end is None or window_start > window_end:
        return []

    block_days = interval_weeks * 7
    blocks: list[tuple[str, str]] = []
    cursor = window_start
    while cursor <= window_end:
        block_end = min(cursor + timedelta(days=block_days - 1), window_end)
        block_length = (block_end - cursor).days + 1
        if block_length < block_days:
            break
        blocks.append((cursor.isoformat(), block_end.isoformat()))
        cursor = block_end + timedelta(days=1)
    return blocks


def interval_block_index(
    iso_date: str,
    start_date: str,
    end_date: str,
    *,
    interval_weeks: int,
) -> int | None:
    parsed = parse_iso_date(iso_date)
    start = parse_iso_date(start_date)
    end = parse_iso_date(end_date)
    if parsed is None or start is None or end is None or parsed < start or parsed > end:
        return None
    for idx, (block_start, block_end) in enumerate(
        interval_block_starts(start_date, end_date, interval_weeks=interval_weeks)
    ):
        if block_start <= iso_date <= block_end:
            return idx
    return None


def top_five_cadence_issues(
    *,
    dated_post_ids: list[tuple[str, str]],
    start_date: str,
    end_date: str,
    lineup_order: list[str] | None = None,
    interval_weeks: int = TOP_FIVE_CATEGORY_INTERVAL_WEEKS,
) -> list[str]:
    """Validate rotating top_five_category cadence: one post every N weeks, not one per id per block."""
    if not dated_post_ids:
        return []

    interval_days = interval_weeks * 7
    sorted_slots = sorted(dated_post_ids, key=lambda row: row[0])
    unique_ids = list(dict.fromkeys(post_id for _iso_date, post_id in sorted_slots))
    rotation_size = len(unique_ids)
    if rotation_size == 0:
        return []

    if lineup_order:
        known = set(unique_ids)
        expected_rotation = [post_id for post_id in lineup_order if post_id in known]
        if not expected_rotation:
            expected_rotation = unique_ids
    else:
        expected_rotation = unique_ids

    blocks = interval_block_starts(start_date, end_date, interval_weeks=interval_weeks)
    posts_per_block: dict[int, int] = {}
    for iso_date, _post_id in sorted_slots:
        block_index = interval_block_index(
            iso_date,
            start_date,
            end_date,
            interval_weeks=interval_weeks,
        )
        if block_index is not None:
            posts_per_block[block_index] = posts_per_block.get(block_index, 0) + 1

    issues: list[str] = []
    for block_index in range(len(blocks)):
        count = posts_per_block.get(block_index, 0)
        if count != 1:
            issues.append(
                f"{interval_weeks}-week block {block_index + 1} has {count} "
                f"top_five_category posts (expected 1)."
            )

    for idx in range(1, len(sorted_slots)):
        prev_date = parse_iso_date(sorted_slots[idx - 1][0])
        curr_date = parse_iso_date(sorted_slots[idx][0])
        if prev_date is None or curr_date is None:
            continue
        gap_days = (curr_date - prev_date).days
        if gap_days < interval_days:
            issues.append(
                f"top_five_category posts on {sorted_slots[idx - 1][0]} and "
                f"{sorted_slots[idx][0]} are {gap_days} days apart "
                f"(expected at least {interval_days})."
            )

    min_same_id_gap = rotation_size * interval_days
    last_seen_by_id: dict[str, date] = {}
    for iso_date, post_id in sorted_slots:
        parsed = parse_iso_date(iso_date)
        if parsed is None:
            continue
        previous = last_seen_by_id.get(post_id)
        if previous is not None:
            gap_days = (parsed - previous).days
            if gap_days < min_same_id_gap:
                issues.append(
                    f"{post_id} repeats after {gap_days} days on {iso_date} "
                    f"(expected at least {min_same_id_gap} when {rotation_size} "
                    f"top_five_category posts rotate)."
                )
        last_seen_by_id[post_id] = parsed

    if rotation_size > 1 and expected_rotation:
        for idx, (_iso_date, post_id) in enumerate(sorted_slots):
            expected_id = expected_rotation[idx % len(expected_rotation)]
            if post_id != expected_id:
                issues.append(
                    "top_five_category posts must rotate through lineup order "
                    f"({', '.join(expected_rotation)}), but position {idx + 1} is {post_id}."
                )
                break

    return issues
