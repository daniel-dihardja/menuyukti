"""Compute a deterministic operating profile for a restaurant from order_fact rows.

The profile summarises:
- weekday vs weekend vs holiday split
- meal-period breakdown (breakfast / lunch / afternoon / dinner / late_night)
- peak day of week (by orders and by revenue)
- average order size (items per order, proxy for party size: groups vs solo/pair)
- average revenue per order (price-point signal)
- average active days per week (operating schedule density)
- categorical labels (operatingPattern, diningFocus) derived from fixed thresholds
"""

from __future__ import annotations

from datetime import datetime, date
from typing import TypedDict

from menuyukti.core.analytics.meal_periods import (
    MEAL_PERIODS,
    WEEKDAY_ORDER,
    WEEKEND_DAYS,
    meal_period_for_hour as _meal_period,
    meal_period_label as _meal_label,
    weekday_abbr as _abbr,
)


_MEAL_PERIODS = MEAL_PERIODS
_WEEKDAY_ORDER = WEEKDAY_ORDER
_WEEKEND_DAYS = WEEKEND_DAYS


class DayOfWeekRow(TypedDict):
    day: str            # "mon" | "tue" | ... | "sun"
    is_weekend: bool
    order_count: int
    share: float
    revenue: float
    revenue_share: float
    is_peak_day: bool


class DayTypeRow(TypedDict):
    type: str           # "weekday" | "weekend" | "holiday"
    order_count: int
    share: float
    revenue: float
    revenue_share: float


class MealPeriodRow(TypedDict):
    period: str
    label: str
    order_count: int
    share: float
    revenue: float
    revenue_share: float
    avg_revenue_per_order: float


class OperatingProfileResult(TypedDict):
    total_orders: int
    total_revenue: float
    active_days_count: int
    avg_daily_orders: float
    avg_order_size: float
    avg_revenue_per_order: float
    avg_active_days_per_week: float
    weekday_share: float
    weekend_share: float
    holiday_share: float
    peak_day: str
    peak_revenue_day: str
    primary_meal_period: str
    peak_revenue_meal_period: str
    active_meal_periods: list[str]
    day_of_week_breakdown: list[DayOfWeekRow]
    day_type_breakdown: list[DayTypeRow]
    meal_period_breakdown: list[MealPeriodRow]
    operating_pattern: str
    dining_focus: str


# ---------------------------------------------------------------------------
# Classification helpers
# ---------------------------------------------------------------------------


def _classify_operating_pattern(weekday_share: float) -> str:
    weekend_share = 1.0 - weekday_share
    if weekday_share >= 0.95:
        return "weekday_only"
    if weekday_share >= 0.65:
        return "weekday_leaning"
    if weekend_share >= 0.60:
        return "weekend_focused"
    if weekend_share >= 0.40:
        return "weekend_leaning"
    return "all_week"


def _classify_dining_focus(period_shares: dict[str, float]) -> str:
    breakfast  = period_shares.get("breakfast", 0.0)
    lunch      = period_shares.get("lunch", 0.0)
    afternoon  = period_shares.get("afternoon", 0.0)
    dinner     = period_shares.get("dinner", 0.0)
    late_night = period_shares.get("late_night", 0.0)

    if breakfast >= 0.40:
        return "breakfast_cafe"
    if lunch >= 0.50:
        return "lunch_spot"
    if dinner >= 0.50:
        return "dinner_restaurant"
    if (lunch + dinner) >= 0.70:
        return "lunch_and_dinner"
    if (breakfast + lunch) >= 0.70 and dinner < 0.20:
        return "breakfast_and_lunch"
    if afternoon >= 0.30:
        return "afternoon_cafe"
    if late_night >= 0.30:
        return "late_night_venue"
    return "all_day_dining"


# ---------------------------------------------------------------------------
# Main computation
# ---------------------------------------------------------------------------


class OrderRowForProfile(TypedDict):
    """Minimum fields required from order_fact rows.

    Optional: qty (int) — when present, used for avg_order_size; defaults to 1 per row.
    """
    order_time: datetime
    bill_number: str
    total_after_bill_discount: float


def _aggregate_positive_revenue_bills(
    order_rows: list[OrderRowForProfile],
) -> tuple[dict[str, float], dict[str, datetime], dict[str, int]] | None:
    """Aggregate line items to bills; drop non-positive revenue bills."""
    bill_revenue: dict[str, float] = {}
    bill_time: dict[str, datetime] = {}
    bill_items: dict[str, int] = {}
    for row in order_rows:
        bn = row["bill_number"]
        t = row["order_time"]
        if bn not in bill_time or t < bill_time[bn]:
            bill_time[bn] = t
        bill_revenue[bn] = bill_revenue.get(bn, 0.0) + row["total_after_bill_discount"]
        raw_qty: object = row.get("qty", 1)
        line_qty = (
            int(raw_qty)
            if isinstance(raw_qty, (int, float)) and not isinstance(raw_qty, bool)
            else 1
        )
        bill_items[bn] = bill_items.get(bn, 0) + line_qty

    bill_revenue = {bn: rev for bn, rev in bill_revenue.items() if rev > 0}
    bill_time = {bn: dt for bn, dt in bill_time.items() if bn in bill_revenue}
    bill_items = {bn: n for bn, n in bill_items.items() if bn in bill_revenue}

    if not bill_time:
        return None
    return bill_revenue, bill_time, bill_items


def _holiday_bill_numbers(
    bill_time: dict[str, datetime],
    holiday_dates: set[date] | None,
) -> set[str]:
    holidays = holiday_dates or set()
    return {bn for bn, dt in bill_time.items() if dt.date() in holidays}


def _compute_dow_metrics(
    bill_time: dict[str, datetime],
    bill_revenue: dict[str, float],
) -> tuple[dict[str, int], dict[str, float], str, str]:
    dow_order_count: dict[str, int] = {d: 0 for d in _WEEKDAY_ORDER}
    dow_revenue: dict[str, float] = {d: 0.0 for d in _WEEKDAY_ORDER}
    for bn, dt in bill_time.items():
        abbr = _abbr(dt)
        dow_order_count[abbr] += 1
        dow_revenue[abbr] += bill_revenue[bn]

    peak_day = max(_WEEKDAY_ORDER, key=lambda d: (dow_order_count[d], dow_revenue[d]))
    peak_revenue_day = max(_WEEKDAY_ORDER, key=lambda d: dow_revenue[d])
    return dow_order_count, dow_revenue, peak_day, peak_revenue_day


def _compute_weekday_weekend_holiday(
    bill_time: dict[str, datetime],
    bill_revenue: dict[str, float],
    holiday_bill_numbers: set[str],
    total_orders: int,
) -> tuple[int, int, int, float, float, float, float, float, float]:
    weekday_orders = 0
    weekend_orders = 0
    weekday_revenue = 0.0
    weekend_revenue = 0.0
    holiday_revenue = 0.0

    for bn, dt in bill_time.items():
        rev = bill_revenue[bn]
        if bn in holiday_bill_numbers:
            holiday_revenue += rev
            continue
        if _abbr(dt) in _WEEKEND_DAYS:
            weekend_orders += 1
            weekend_revenue += rev
        else:
            weekday_orders += 1
            weekday_revenue += rev

    holiday_orders = len(holiday_bill_numbers)
    weekday_share = weekday_orders / total_orders if total_orders else 0.0
    weekend_share = weekend_orders / total_orders if total_orders else 0.0
    holiday_share = holiday_orders / total_orders if total_orders else 0.0

    return (
        weekday_orders,
        weekend_orders,
        holiday_orders,
        weekday_revenue,
        weekend_revenue,
        holiday_revenue,
        weekday_share,
        weekend_share,
        holiday_share,
    )


def _compute_meal_period_metrics(
    bill_time: dict[str, datetime],
    bill_revenue: dict[str, float],
    total_orders: int,
) -> tuple[
    dict[str, int],
    dict[str, float],
    dict[str, float],
    str,
    str,
    list[str],
]:
    mp_order_count: dict[str, int] = {p: 0 for p, _, _ in _MEAL_PERIODS}
    mp_revenue: dict[str, float] = {p: 0.0 for p, _, _ in _MEAL_PERIODS}
    for bn, dt in bill_time.items():
        period = _meal_period(dt.hour)
        mp_order_count[period] += 1
        mp_revenue[period] += bill_revenue[bn]

    period_shares = {
        p: (mp_order_count[p] / total_orders if total_orders else 0.0)
        for p, _, _ in _MEAL_PERIODS
    }
    primary_meal_period = max(
        (p for p, _, _ in _MEAL_PERIODS),
        key=lambda p: (mp_order_count[p], mp_revenue[p]),
    )
    peak_revenue_meal_period = max(
        (p for p, _, _ in _MEAL_PERIODS),
        key=lambda p: mp_revenue[p],
    )
    active_meal_periods = [
        p for p, _, _ in _MEAL_PERIODS if period_shares[p] >= 0.05
    ]
    return (
        mp_order_count,
        mp_revenue,
        period_shares,
        primary_meal_period,
        peak_revenue_meal_period,
        active_meal_periods,
    )


def compute_operating_profile_from_orders(
    order_rows: list[OrderRowForProfile],
    holiday_dates: set[date] | None = None,
) -> OperatingProfileResult | None:
    """Compute a deterministic operating profile from a list of order_fact rows.

    Returns None when order_rows is empty.

    Args:
        order_rows: Each entry must contain order_time (datetime),
            bill_number (str), and total_after_bill_discount (float).
            Optional qty (int) for avg_order_size; defaults to 1 per row when absent.
        holiday_dates: Optional set of public holiday dates. When provided, holiday
            orders are classified as a third day-type and excluded from the
            weekday/weekend shares so those remain meaningful.
    """
    if not order_rows:
        return None

    aggregated = _aggregate_positive_revenue_bills(order_rows)
    if aggregated is None:
        return None
    bill_revenue, bill_time, bill_items = aggregated

    total_orders = len(bill_time)
    total_revenue = sum(bill_revenue.values())
    total_items = sum(bill_items.values())
    avg_order_size = total_items / total_orders if total_orders else 0.0
    avg_revenue_per_order = total_revenue / total_orders if total_orders else 0.0

    # Calendar days with at least one order
    active_dates: set[date] = {dt.date() for dt in bill_time.values()}
    active_days_count = len(active_dates)
    avg_daily_orders = total_orders / active_days_count if active_days_count else 0.0

    # Average active days per week — how densely the venue operates.
    # period_span_days is the calendar window covered by the data.
    min_date = min(active_dates)
    max_date = max(active_dates)
    period_span_days = (max_date - min_date).days + 1
    avg_active_days_per_week = round(
        min(7.0, active_days_count / (period_span_days / 7)), 2
    )

    holiday_bill_numbers = _holiday_bill_numbers(bill_time, holiday_dates)

    dow_order_count, dow_revenue, peak_day, peak_revenue_day = _compute_dow_metrics(
        bill_time,
        bill_revenue,
    )

    (
        weekday_orders,
        weekend_orders,
        holiday_orders,
        weekday_revenue,
        weekend_revenue,
        holiday_revenue,
        weekday_share,
        weekend_share,
        holiday_share,
    ) = _compute_weekday_weekend_holiday(
        bill_time,
        bill_revenue,
        holiday_bill_numbers,
        total_orders,
    )

    (
        mp_order_count,
        mp_revenue,
        period_shares,
        primary_meal_period,
        peak_revenue_meal_period,
        active_meal_periods,
    ) = _compute_meal_period_metrics(bill_time, bill_revenue, total_orders)

    # Build output rows
    day_of_week_breakdown: list[DayOfWeekRow] = [
        DayOfWeekRow(
            day=d,
            is_weekend=d in _WEEKEND_DAYS,
            order_count=dow_order_count[d],
            share=round(dow_order_count[d] / total_orders, 4) if total_orders else 0.0,
            revenue=round(dow_revenue[d], 4),
            revenue_share=round(dow_revenue[d] / total_revenue, 4) if total_revenue else 0.0,
            is_peak_day=(d == peak_day),
        )
        for d in _WEEKDAY_ORDER
    ]

    day_type_breakdown: list[DayTypeRow] = [
        DayTypeRow(
            type="weekday",
            order_count=weekday_orders,
            share=round(weekday_share, 4),
            revenue=round(weekday_revenue, 4),
            revenue_share=round(weekday_revenue / total_revenue, 4) if total_revenue else 0.0,
        ),
        DayTypeRow(
            type="weekend",
            order_count=weekend_orders,
            share=round(weekend_share, 4),
            revenue=round(weekend_revenue, 4),
            revenue_share=round(weekend_revenue / total_revenue, 4) if total_revenue else 0.0,
        ),
    ]
    if holiday_orders > 0:
        day_type_breakdown.append(
            DayTypeRow(
                type="holiday",
                order_count=holiday_orders,
                share=round(holiday_share, 4),
                revenue=round(holiday_revenue, 4),
                revenue_share=round(holiday_revenue / total_revenue, 4) if total_revenue else 0.0,
            )
        )

    meal_period_breakdown: list[MealPeriodRow] = [
        MealPeriodRow(
            period=p,
            label=_meal_label(p),
            order_count=mp_order_count[p],
            share=round(period_shares[p], 4),
            revenue=round(mp_revenue[p], 4),
            revenue_share=round(mp_revenue[p] / total_revenue, 4) if total_revenue else 0.0,
            avg_revenue_per_order=round(
                mp_revenue[p] / mp_order_count[p], 4
            ) if mp_order_count[p] else 0.0,
        )
        for p, _, _ in _MEAL_PERIODS
    ]

    # operating_pattern is based on non-holiday weekday/weekend distribution.
    # Normalise shares to exclude holiday fraction so the classifier thresholds
    # remain valid even when holiday_share is significant.
    non_holiday_share = weekday_share + weekend_share
    if non_holiday_share > 0:
        wd_for_pattern = weekday_share / non_holiday_share
    else:
        wd_for_pattern = weekday_share

    return OperatingProfileResult(
        total_orders=total_orders,
        total_revenue=round(total_revenue, 4),
        active_days_count=active_days_count,
        avg_daily_orders=round(avg_daily_orders, 4),
        avg_order_size=round(avg_order_size, 4),
        avg_revenue_per_order=round(avg_revenue_per_order, 4),
        avg_active_days_per_week=avg_active_days_per_week,
        weekday_share=round(weekday_share, 4),
        weekend_share=round(weekend_share, 4),
        holiday_share=round(holiday_share, 4),
        peak_day=peak_day,
        peak_revenue_day=peak_revenue_day,
        primary_meal_period=primary_meal_period,
        peak_revenue_meal_period=peak_revenue_meal_period,
        active_meal_periods=active_meal_periods,
        day_of_week_breakdown=day_of_week_breakdown,
        day_type_breakdown=day_type_breakdown,
        meal_period_breakdown=meal_period_breakdown,
        operating_pattern=_classify_operating_pattern(wd_for_pattern),
        dining_focus=_classify_dining_focus(period_shares),
    )
