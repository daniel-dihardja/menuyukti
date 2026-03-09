"""Compute a deterministic operating profile for a restaurant from order_fact rows.

The profile summarises:
- weekday vs weekend split
- meal-period breakdown (breakfast / lunch / afternoon / dinner / late_night)
- peak day of week
- categorical labels (operatingPattern, diningFocus) derived from fixed thresholds
"""

from __future__ import annotations

from datetime import datetime, date
from typing import TypedDict


# ---------------------------------------------------------------------------
# Meal period definitions (non-overlapping, hour-based)
# ---------------------------------------------------------------------------

_MEAL_PERIODS: list[tuple[str, str, set[int]]] = [
    ("breakfast",  "Breakfast (05:00–10:59)",  set(range(5, 11))),
    ("lunch",      "Lunch (11:00–14:59)",       set(range(11, 15))),
    ("afternoon",  "Afternoon (15:00–16:59)",   set(range(15, 17))),
    ("dinner",     "Dinner (17:00–21:59)",       set(range(17, 22))),
    ("late_night", "Late Night (22:00–04:59)",  set(range(22, 24)) | set(range(0, 5))),
]

_WEEKDAY_ORDER = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]
_WEEKEND_DAYS = {"sat", "sun"}


def _abbr(dt: datetime) -> str:
    """Return 3-letter lowercase weekday abbreviation."""
    return dt.strftime("%a").lower()


def _meal_period(hour: int) -> str:
    for period, _label, hours in _MEAL_PERIODS:
        if hour in hours:
            return period
    return "late_night"


def _meal_label(period: str) -> str:
    for p, label, _ in _MEAL_PERIODS:
        if p == period:
            return label
    return period


# ---------------------------------------------------------------------------
# Output TypedDicts
# ---------------------------------------------------------------------------


class DayOfWeekRow(TypedDict):
    day: str            # "mon" | "tue" | ... | "sun"
    is_weekend: bool
    order_count: int
    share: float
    revenue: float
    is_peak_day: bool


class DayTypeRow(TypedDict):
    type: str           # "weekday" | "weekend"
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


class OperatingProfileResult(TypedDict):
    total_orders: int
    total_revenue: float
    active_days_count: int
    avg_daily_orders: float
    weekday_share: float
    weekend_share: float
    peak_day: str
    primary_meal_period: str
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
    breakfast = period_shares.get("breakfast", 0.0)
    lunch = period_shares.get("lunch", 0.0)
    dinner = period_shares.get("dinner", 0.0)

    if breakfast >= 0.40:
        return "breakfast_cafe"
    if lunch >= 0.50:
        return "lunch_spot"
    if dinner >= 0.50:
        return "dinner_restaurant"
    if (lunch + dinner) >= 0.70:
        return "lunch_and_dinner"
    return "all_day_dining"


# ---------------------------------------------------------------------------
# Main computation
# ---------------------------------------------------------------------------


class OrderRowForProfile(TypedDict):
    """Minimum fields required from order_fact rows."""
    order_time: datetime
    bill_number: str
    total_after_bill_discount: float


def compute_operating_profile_from_orders(
    order_rows: list[OrderRowForProfile],
) -> OperatingProfileResult | None:
    """Compute a deterministic operating profile from a list of order_fact rows.

    Returns None when order_rows is empty.

    Args:
        order_rows: Each entry must contain order_time (datetime),
            bill_number (str), and total_after_bill_discount (float).
    """
    if not order_rows:
        return None

    # Aggregate per bill (order-level revenue)
    bill_revenue: dict[str, float] = {}
    bill_time: dict[str, datetime] = {}
    for row in order_rows:
        bn = row["bill_number"]
        if bn not in bill_time:
            bill_time[bn] = row["order_time"]
        bill_revenue[bn] = bill_revenue.get(bn, 0.0) + row["total_after_bill_discount"]

    total_orders = len(bill_time)
    total_revenue = sum(bill_revenue.values())

    # Calendar days with at least one order
    active_dates: set[date] = {dt.date() for dt in bill_time.values()}
    active_days_count = len(active_dates)
    avg_daily_orders = total_orders / active_days_count if active_days_count else 0.0

    # Day-of-week counts and revenue
    dow_order_count: dict[str, int] = {d: 0 for d in _WEEKDAY_ORDER}
    dow_revenue: dict[str, float] = {d: 0.0 for d in _WEEKDAY_ORDER}
    for bn, dt in bill_time.items():
        abbr = _abbr(dt)
        dow_order_count[abbr] = dow_order_count.get(abbr, 0) + 1
        dow_revenue[abbr] = dow_revenue.get(abbr, 0.0) + bill_revenue[bn]

    peak_day = max(_WEEKDAY_ORDER, key=lambda d: dow_order_count[d])

    weekday_orders = sum(dow_order_count[d] for d in _WEEKDAY_ORDER if d not in _WEEKEND_DAYS)
    weekend_orders = sum(dow_order_count[d] for d in _WEEKDAY_ORDER if d in _WEEKEND_DAYS)
    weekday_revenue = sum(dow_revenue[d] for d in _WEEKDAY_ORDER if d not in _WEEKEND_DAYS)
    weekend_revenue = sum(dow_revenue[d] for d in _WEEKDAY_ORDER if d in _WEEKEND_DAYS)

    weekday_share = weekday_orders / total_orders if total_orders else 0.0
    weekend_share = weekend_orders / total_orders if total_orders else 0.0

    # Meal period counts and revenue — keyed by first order time per bill
    mp_order_count: dict[str, int] = {p: 0 for p, _, _ in _MEAL_PERIODS}
    mp_revenue: dict[str, float] = {p: 0.0 for p, _, _ in _MEAL_PERIODS}
    for bn, dt in bill_time.items():
        period = _meal_period(dt.hour)
        mp_order_count[period] = mp_order_count.get(period, 0) + 1
        mp_revenue[period] = mp_revenue.get(period, 0.0) + bill_revenue[bn]

    period_shares = {
        p: (mp_order_count[p] / total_orders if total_orders else 0.0)
        for p, _, _ in _MEAL_PERIODS
    }
    primary_meal_period = max(
        (p for p, _, _ in _MEAL_PERIODS),
        key=lambda p: mp_order_count[p],
    )
    active_meal_periods = [
        p for p, _, _ in _MEAL_PERIODS if period_shares[p] >= 0.05
    ]

    # Build output rows
    day_of_week_breakdown: list[DayOfWeekRow] = [
        DayOfWeekRow(
            day=d,
            is_weekend=d in _WEEKEND_DAYS,
            order_count=dow_order_count[d],
            share=dow_order_count[d] / total_orders if total_orders else 0.0,
            revenue=round(dow_revenue[d], 4),
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

    meal_period_breakdown: list[MealPeriodRow] = [
        MealPeriodRow(
            period=p,
            label=_meal_label(p),
            order_count=mp_order_count[p],
            share=round(period_shares[p], 4),
            revenue=round(mp_revenue[p], 4),
            revenue_share=round(mp_revenue[p] / total_revenue, 4) if total_revenue else 0.0,
        )
        for p, _, _ in _MEAL_PERIODS
    ]

    return OperatingProfileResult(
        total_orders=total_orders,
        total_revenue=round(total_revenue, 4),
        active_days_count=active_days_count,
        avg_daily_orders=round(avg_daily_orders, 4),
        weekday_share=round(weekday_share, 4),
        weekend_share=round(weekend_share, 4),
        peak_day=peak_day,
        primary_meal_period=primary_meal_period,
        active_meal_periods=active_meal_periods,
        day_of_week_breakdown=day_of_week_breakdown,
        day_type_breakdown=day_type_breakdown,
        meal_period_breakdown=meal_period_breakdown,
        operating_pattern=_classify_operating_pattern(weekday_share),
        dining_focus=_classify_dining_focus(period_shares),
    )
