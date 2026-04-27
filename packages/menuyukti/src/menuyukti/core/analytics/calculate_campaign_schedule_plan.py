"""Build campaign schedule slots from existing promotion and demand signals."""

from __future__ import annotations

from collections import defaultdict
from datetime import date, datetime, timedelta
from typing import Literal, TypedDict

_DAY_NAMES = ("mon", "tue", "wed", "thu", "fri", "sat", "sun")
_DAY_TO_INDEX = {name: idx for idx, name in enumerate(_DAY_NAMES)}
_HOUR_MIN = 8
_HOUR_MAX = 21
_MAX_PROMOTED_ITEMS = 2


class CampaignScheduleBestPostingWindow(TypedDict):
    peak_day: str | None
    peak_hour: int | None
    primary_meal_period: str | None


class CampaignScheduleCandidate(TypedDict):
    menu: str
    recommendation: str
    score: float
    signal_reasons: list[str]


class CampaignScheduleWeeklyDemandRow(TypedDict):
    iso_week: str
    revenue_index: float
    tx_index: float
    relative_demand: Literal["low", "average", "high"]


class CampaignScheduleHolidayRow(TypedDict):
    date: str
    name: str


class CampaignScheduleSlot(TypedDict):
    date_time: str
    post_type: Literal["single", "carousel"]
    promoted_menu_items: list[str]
    visual_idea: str
    caption_idea: str


class CampaignSchedulePlanResult(TypedDict):
    campaign_start: str
    campaign_end: str
    timezone: str
    posts_per_week: int
    slots: list[CampaignScheduleSlot]
    source_signals_summary: str


def _parse_iso_date(raw: str, *, field: str) -> date:
    value = raw.strip()
    try:
        return datetime.strptime(value, "%Y-%m-%d").date()
    except ValueError as exc:
        msg = f"{field} must be YYYY-MM-DD"
        raise ValueError(msg) from exc


def _daterange(start: date, end: date) -> list[date]:
    out: list[date] = []
    cursor = start
    while cursor <= end:
        out.append(cursor)
        cursor += timedelta(days=1)
    return out


def _base_posts_per_week(rows: list[CampaignScheduleWeeklyDemandRow]) -> int:
    if not rows:
        return 3
    high = len([r for r in rows if r.get("relative_demand") == "high"])
    low = len([r for r in rows if r.get("relative_demand") == "low"])
    if high >= max(2, len(rows) // 2):
        return 4
    if low >= max(2, len(rows) // 2):
        return 2
    avg_revenue_index = sum(float(r.get("revenue_index") or 0.0) for r in rows) / max(len(rows), 1)
    if avg_revenue_index >= 1.1:
        return 4
    if avg_revenue_index <= 0.9:
        return 2
    return 3


def _normalize_peak_day(raw: str | None) -> str | None:
    if raw is None:
        return None
    value = raw.strip().lower()
    if not value:
        return None
    for day in _DAY_NAMES:
        if value.startswith(day):
            return day
    return None


def _base_hour(window: CampaignScheduleBestPostingWindow | None) -> int:
    if window is None:
        return 19
    peak_hour = window.get("peak_hour")
    if isinstance(peak_hour, int):
        return max(_HOUR_MIN, min(_HOUR_MAX, peak_hour))
    period = str(window.get("primary_meal_period") or "").strip().lower()
    if period == "breakfast":
        return 9
    if period == "lunch":
        return 12
    if period == "afternoon":
        return 15
    return 19


def _recommended_candidates(
    ranked_candidates: list[CampaignScheduleCandidate],
) -> list[CampaignScheduleCandidate]:
    preferred = [
        c
        for c in ranked_candidates
        if str(c.get("menu") or "").strip()
        and str(c.get("recommendation") or "").strip().lower() in {"promote", "test"}
    ]
    if preferred:
        return preferred
    return [c for c in ranked_candidates if str(c.get("menu") or "").strip()]


def _build_source_summary(
    *,
    peak_day: str | None,
    peak_hour: int,
    candidates_count: int,
    weekly_rows: list[CampaignScheduleWeeklyDemandRow],
    holidays_count: int,
) -> str:
    parts = [f"{candidates_count} promotion candidates considered"]
    if peak_day:
        parts.append(f"peak day hint: {peak_day}")
    parts.append(f"base hour: {peak_hour:02d}:00")
    if weekly_rows:
        high_weeks = len([r for r in weekly_rows if r.get("relative_demand") == "high"])
        parts.append(f"high-demand weeks: {high_weeks}")
    else:
        parts.append("weekly demand unavailable")
    if holidays_count > 0:
        parts.append(f"holiday anchors: {holidays_count}")
    else:
        parts.append("holiday anchors unavailable")
    return "; ".join(parts)


def calculate_campaign_schedule_plan(
    *,
    campaign_start: str,
    campaign_end: str,
    ranked_candidates: list[CampaignScheduleCandidate],
    weekly_demand_pattern: list[CampaignScheduleWeeklyDemandRow] | None = None,
    public_holidays: list[CampaignScheduleHolidayRow] | None = None,
    best_posting_window: CampaignScheduleBestPostingWindow | None = None,
    allowed_weekdays: set[int] | None = None,
    timezone: str = "Asia/Jakarta",
) -> CampaignSchedulePlanResult:
    """Generate adaptive posting slots across the campaign window."""
    start = _parse_iso_date(campaign_start, field="campaign_start")
    end = _parse_iso_date(campaign_end, field="campaign_end")
    if start > end:
        raise ValueError("campaign_start must be on or before campaign_end")

    weekly_rows = weekly_demand_pattern or []
    posts_per_week = _base_posts_per_week(weekly_rows)
    campaign_days = (end - start).days + 1
    target_slots = max(1, round((campaign_days / 7.0) * posts_per_week))
    target_slots = min(target_slots, campaign_days)

    preferred_peak_day = _normalize_peak_day(
        best_posting_window.get("peak_day") if best_posting_window is not None else None
    )
    preferred_order: list[int] = []
    if preferred_peak_day is not None:
        preferred_order.append(_DAY_TO_INDEX[preferred_peak_day])
    preferred_order.extend(i for i in range(7) if i not in preferred_order)
    weekday_rank = {dow: rank for rank, dow in enumerate(preferred_order)}

    demand_by_week: dict[str, str] = {
        str(row.get("iso_week") or ""): str(row.get("relative_demand") or "average")
        for row in weekly_rows
        if str(row.get("iso_week") or "")
    }
    holiday_map: dict[str, str] = {}
    for raw in public_holidays or []:
        raw_date = str(raw.get("date") or "").strip()
        raw_name = str(raw.get("name") or "").strip()
        if raw_date:
            holiday_map[raw_date] = raw_name

    week_buckets: dict[str, list[tuple[date, int]]] = defaultdict(list)
    allowed_days = (
        {dow for dow in allowed_weekdays if 0 <= dow <= 6} if allowed_weekdays is not None else None
    )
    for day in _daterange(start, end):
        if allowed_days is not None and day.weekday() not in allowed_days:
            continue
        iso_week = f"{day.isocalendar().year}-W{day.isocalendar().week:02d}"
        rel = demand_by_week.get(iso_week, "average")
        rel_score = 2 if rel == "high" else 1 if rel == "average" else 0
        holiday_boost = 2 if day.isoformat() in holiday_map else 0
        day_score = (2 - weekday_rank.get(day.weekday(), 6)) + rel_score + holiday_boost
        week_buckets[iso_week].append((day, day_score))

    for rows in week_buckets.values():
        rows.sort(key=lambda item: (-item[1], item[0]))

    week_keys = sorted(week_buckets.keys())
    selected_dates: list[date] = []
    if week_keys:
        week_idx = 0
        while len(selected_dates) < target_slots:
            key = week_keys[week_idx % len(week_keys)]
            bucket = week_buckets[key]
            while bucket and bucket[0][0] in selected_dates:
                bucket.pop(0)
            if bucket:
                selected_dates.append(bucket.pop(0)[0])
            if all(not week_buckets[wk] for wk in week_keys):
                break
            week_idx += 1

    selected_dates.sort()
    candidate_pool = _recommended_candidates(ranked_candidates)
    if not candidate_pool:
        candidate_pool = [
            CampaignScheduleCandidate(
                menu="Chef's selection",
                recommendation="test",
                score=0.0,
                signal_reasons=["No ranked candidate data available"],
            )
        ]

    base_hour = _base_hour(best_posting_window)
    hour_offsets = (0, 1, -1, 0)
    slots: list[CampaignScheduleSlot] = []
    last_primary_menu = ""
    post_type_cycle: tuple[Literal["single", "carousel"], ...] = (
        "carousel",
        "single",
        "single",
        "carousel",
    )
    for idx, day in enumerate(selected_dates):
        primary = candidate_pool[idx % len(candidate_pool)]
        if str(primary.get("menu") or "") == last_primary_menu and len(candidate_pool) > 1:
            primary = candidate_pool[(idx + 1) % len(candidate_pool)]
        promoted = [str(primary["menu"])]
        if len(candidate_pool) > 1 and idx % 3 == 0:
            secondary = candidate_pool[(idx + 1) % len(candidate_pool)]
            if secondary["menu"] != primary["menu"]:
                promoted.append(str(secondary["menu"]))
        promoted = promoted[:_MAX_PROMOTED_ITEMS]
        last_primary_menu = promoted[0]

        hour = max(_HOUR_MIN, min(_HOUR_MAX, base_hour + hour_offsets[idx % len(hour_offsets)]))
        dt = f"{day.isoformat()}T{hour:02d}:00:00"
        post_type = post_type_cycle[idx % len(post_type_cycle)]
        reason = primary.get("signal_reasons") or []
        reason_text = str(reason[0]) if reason else "strong promotion potential"
        holiday_name = holiday_map.get(day.isoformat())
        holiday_note = f" Holiday hook: {holiday_name}." if holiday_name else ""

        slots.append(
            CampaignScheduleSlot(
                date_time=dt,
                post_type=post_type,
                promoted_menu_items=promoted,
                visual_idea=(
                    f"{promoted[0]} hero shot with kitchen action and plated close-up; "
                    f"add on-screen cue for {day.strftime('%a')} {hour:02d}:00 push."
                ),
                caption_idea=(
                    f"Spotlight {', '.join(promoted)} this {day.strftime('%A')} around {hour:02d}:00. "
                    f"Signal: {reason_text}.{holiday_note}"
                ),
            )
        )

    return CampaignSchedulePlanResult(
        campaign_start=start.isoformat(),
        campaign_end=end.isoformat(),
        timezone=timezone,
        posts_per_week=posts_per_week,
        slots=slots,
        source_signals_summary=_build_source_summary(
            peak_day=preferred_peak_day,
            peak_hour=base_hour,
            candidates_count=len(candidate_pool),
            weekly_rows=weekly_rows,
            holidays_count=len(holiday_map),
        ),
    )
