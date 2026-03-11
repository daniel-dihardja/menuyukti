"""Unit tests for compute_operating_profile_from_orders.

All tests use inline order rows — no DB or file fixtures required.
"""

from datetime import datetime, date

import pytest

from menuyukti.core.analytics.calculate_operating_profile import (
    compute_operating_profile_from_orders,
)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

_BASE_MON = datetime(2024, 6, 3)   # Monday
_BASE_TUE = datetime(2024, 6, 4)   # Tuesday
_BASE_WED = datetime(2024, 6, 5)   # Wednesday
_BASE_THU = datetime(2024, 6, 6)   # Thursday
_BASE_FRI = datetime(2024, 6, 7)   # Friday
_BASE_SAT = datetime(2024, 6, 8)   # Saturday
_BASE_SUN = datetime(2024, 6, 9)   # Sunday


def _row(bill: str, dt: datetime, revenue: float = 10.0, qty: int = 1) -> dict:
    return {
        "bill_number": bill,
        "order_time": dt,
        "total_after_bill_discount": revenue,
        "qty": qty,
    }


# ---------------------------------------------------------------------------
# Empty input
# ---------------------------------------------------------------------------


def test_empty_returns_none():
    assert compute_operating_profile_from_orders([]) is None


# ---------------------------------------------------------------------------
# Zero/negative revenue filtering
# ---------------------------------------------------------------------------


def test_zero_revenue_bill_excluded_from_total_orders():
    rows = [
        _row("PAID", _BASE_MON.replace(hour=12), revenue=20.0),
        _row("FREE", _BASE_TUE.replace(hour=12), revenue=0.0),
    ]
    result = compute_operating_profile_from_orders(rows)
    assert result is not None
    assert result["total_orders"] == 1
    assert abs(result["total_revenue"] - 20.0) < 1e-4


def test_negative_revenue_bill_excluded():
    rows = [
        _row("PAID", _BASE_MON.replace(hour=12), revenue=15.0),
        _row("VOID", _BASE_TUE.replace(hour=12), revenue=-5.0),
    ]
    result = compute_operating_profile_from_orders(rows)
    assert result is not None
    assert result["total_orders"] == 1
    assert abs(result["total_revenue"] - 15.0) < 1e-4


def test_all_zero_revenue_returns_none():
    rows = [
        _row("F1", _BASE_MON.replace(hour=12), revenue=0.0),
        _row("F2", _BASE_TUE.replace(hour=12), revenue=0.0),
    ]
    assert compute_operating_profile_from_orders(rows) is None


def test_zero_revenue_excluded_from_dow_distribution():
    # Only the paid Monday order should count; Tuesday (free) must not affect shares
    rows = [
        _row("P1", _BASE_MON.replace(hour=12), revenue=10.0),
        _row("P2", _BASE_MON.replace(hour=13), revenue=10.0),
        _row("FREE", _BASE_TUE.replace(hour=12), revenue=0.0),
    ]
    result = compute_operating_profile_from_orders(rows)
    assert result is not None
    assert result["total_orders"] == 2
    assert result["peak_day"] == "mon"
    mon_row = next(r for r in result["day_of_week_breakdown"] if r["day"] == "mon")
    assert mon_row["order_count"] == 2
    tue_row = next(r for r in result["day_of_week_breakdown"] if r["day"] == "tue")
    assert tue_row["order_count"] == 0


# ---------------------------------------------------------------------------
# Bill time uses earliest row, not first-seen
# ---------------------------------------------------------------------------


def test_bill_time_uses_minimum_order_time():
    # Rows arrive in reverse chronological order within the same bill.
    # The meal period should be classified by the earliest time (hour=12 → lunch),
    # not the first-seen row (hour=19 → dinner).
    rows = [
        _row("B1", _BASE_MON.replace(hour=19), revenue=5.0),  # arrives first but later
        _row("B1", _BASE_MON.replace(hour=12), revenue=5.0),  # arrives second but earlier
    ]
    result = compute_operating_profile_from_orders(rows)
    assert result is not None
    assert result["primary_meal_period"] == "lunch"


# ---------------------------------------------------------------------------
# Weekday / weekend classification
# ---------------------------------------------------------------------------


def test_weekday_only():
    rows = [
        _row("B1", _BASE_MON.replace(hour=12)),
        _row("B2", _BASE_TUE.replace(hour=12)),
        _row("B3", _BASE_WED.replace(hour=12)),
        _row("B4", _BASE_THU.replace(hour=12)),
        _row("B5", _BASE_FRI.replace(hour=12)),
    ]
    result = compute_operating_profile_from_orders(rows)
    assert result is not None
    assert result["weekday_share"] == 1.0
    assert result["weekend_share"] == 0.0
    assert result["operating_pattern"] == "weekday_only"


def test_weekday_leaning():
    # 4 weekday orders, 1 weekend → 80% weekday
    rows = [
        _row("B1", _BASE_MON.replace(hour=12)),
        _row("B2", _BASE_TUE.replace(hour=12)),
        _row("B3", _BASE_WED.replace(hour=12)),
        _row("B4", _BASE_THU.replace(hour=12)),
        _row("B5", _BASE_SAT.replace(hour=12)),
    ]
    result = compute_operating_profile_from_orders(rows)
    assert result is not None
    assert result["operating_pattern"] == "weekday_leaning"
    assert abs(result["weekday_share"] - 0.8) < 1e-4


def test_all_week():
    # 8 weekday, 5 weekend → 8/13=0.615 weekday, 5/13=0.385 weekend → all_week
    rows = (
        [_row(f"WD{i}", _BASE_MON.replace(hour=12), 10.0) for i in range(8)]
        + [_row(f"WE{i}", _BASE_SAT.replace(hour=12), 10.0) for i in range(5)]
    )
    result = compute_operating_profile_from_orders(rows)
    assert result is not None
    assert result["operating_pattern"] == "all_week"


def test_weekend_leaning():
    # 2 weekday, 3 weekend → 40% weekday, 60% weekend → weekend_focused
    rows = [
        _row("B1", _BASE_MON.replace(hour=12)),
        _row("B2", _BASE_TUE.replace(hour=12)),
        _row("B3", _BASE_SAT.replace(hour=12)),
        _row("B4", _BASE_SAT.replace(hour=13)),
        _row("B5", _BASE_SUN.replace(hour=12)),
    ]
    result = compute_operating_profile_from_orders(rows)
    assert result is not None
    assert result["operating_pattern"] == "weekend_focused"
    assert result["weekend_share"] > result["weekday_share"]


# ---------------------------------------------------------------------------
# Holiday day-type classification
# ---------------------------------------------------------------------------


def test_holiday_order_creates_holiday_day_type_row():
    holiday = date(2024, 6, 3)  # Monday is a public holiday
    rows = [
        _row("H1", _BASE_MON.replace(hour=12), revenue=20.0),
        _row("WD1", _BASE_TUE.replace(hour=12), revenue=10.0),
        _row("WE1", _BASE_SAT.replace(hour=12), revenue=10.0),
    ]
    result = compute_operating_profile_from_orders(rows, holiday_dates={holiday})
    assert result is not None
    types = {r["type"] for r in result["day_type_breakdown"]}
    assert "holiday" in types


def test_holiday_share_is_correct():
    holiday = date(2024, 6, 3)  # Monday
    rows = [
        _row("H1", _BASE_MON.replace(hour=12), revenue=10.0),
        _row("WD1", _BASE_TUE.replace(hour=12), revenue=10.0),
        _row("WD2", _BASE_WED.replace(hour=12), revenue=10.0),
        _row("WD3", _BASE_THU.replace(hour=12), revenue=10.0),
    ]
    result = compute_operating_profile_from_orders(rows, holiday_dates={holiday})
    assert result is not None
    assert abs(result["holiday_share"] - 0.25) < 1e-4


def test_holiday_orders_excluded_from_weekday_weekend_shares():
    # 1 holiday (Mon), 2 weekday (Tue, Wed), 1 weekend (Sat) → total=4
    # weekday_share = 2/4 = 0.5, weekend_share = 1/4 = 0.25, holiday_share = 1/4 = 0.25
    holiday = date(2024, 6, 3)  # Monday
    rows = [
        _row("H1", _BASE_MON.replace(hour=12), revenue=10.0),
        _row("WD1", _BASE_TUE.replace(hour=12), revenue=10.0),
        _row("WD2", _BASE_WED.replace(hour=12), revenue=10.0),
        _row("WE1", _BASE_SAT.replace(hour=12), revenue=10.0),
    ]
    result = compute_operating_profile_from_orders(rows, holiday_dates={holiday})
    assert result is not None
    assert abs(result["weekday_share"] - 0.5) < 1e-4
    assert abs(result["weekend_share"] - 0.25) < 1e-4
    assert abs(result["holiday_share"] - 0.25) < 1e-4
    # shares must sum to 1.0
    total = result["weekday_share"] + result["weekend_share"] + result["holiday_share"]
    assert abs(total - 1.0) < 1e-4


def test_no_holiday_dates_produces_only_weekday_weekend():
    rows = [
        _row("B1", _BASE_MON.replace(hour=12)),
        _row("B2", _BASE_SAT.replace(hour=12)),
    ]
    result = compute_operating_profile_from_orders(rows)
    assert result is not None
    types = {r["type"] for r in result["day_type_breakdown"]}
    assert types == {"weekday", "weekend"}
    assert result["holiday_share"] == 0.0


def test_holiday_day_type_row_absent_when_no_holiday_orders():
    # holiday_dates provided but no orders fall on those dates
    holiday = date(2024, 6, 10)  # a date not in the data
    rows = [
        _row("B1", _BASE_MON.replace(hour=12)),
        _row("B2", _BASE_SAT.replace(hour=12)),
    ]
    result = compute_operating_profile_from_orders(rows, holiday_dates={holiday})
    assert result is not None
    types = {r["type"] for r in result["day_type_breakdown"]}
    assert "holiday" not in types


# ---------------------------------------------------------------------------
# Revenue tiebreaker for peak day and primary meal period
# ---------------------------------------------------------------------------


def test_peak_day_revenue_tiebreaker():
    # Mon and Tue both have 2 orders; Tue has higher revenue → Tue should win
    rows = [
        _row("M1", _BASE_MON.replace(hour=12), revenue=10.0),
        _row("M2", _BASE_MON.replace(hour=13), revenue=10.0),
        _row("T1", _BASE_TUE.replace(hour=12), revenue=50.0),
        _row("T2", _BASE_TUE.replace(hour=13), revenue=50.0),
    ]
    result = compute_operating_profile_from_orders(rows)
    assert result is not None
    assert result["peak_day"] == "tue"


def test_primary_meal_period_revenue_tiebreaker():
    # lunch and dinner both have 2 orders; dinner has higher revenue → dinner wins
    rows = [
        _row("L1", _BASE_MON.replace(hour=12), revenue=10.0),
        _row("L2", _BASE_TUE.replace(hour=12), revenue=10.0),
        _row("D1", _BASE_MON.replace(hour=19), revenue=50.0),
        _row("D2", _BASE_TUE.replace(hour=19), revenue=50.0),
    ]
    result = compute_operating_profile_from_orders(rows)
    assert result is not None
    assert result["primary_meal_period"] == "dinner"


# ---------------------------------------------------------------------------
# Explicit peak revenue fields
# ---------------------------------------------------------------------------


def test_peak_revenue_day_differs_from_peak_order_day():
    # Mon has 3 orders (most) but low value; Fri has 1 order but high value
    rows = [
        _row("M1", _BASE_MON.replace(hour=12), revenue=5.0),
        _row("M2", _BASE_MON.replace(hour=13), revenue=5.0),
        _row("M3", _BASE_MON.replace(hour=14), revenue=5.0),
        _row("F1", _BASE_FRI.replace(hour=12), revenue=100.0),
    ]
    result = compute_operating_profile_from_orders(rows)
    assert result is not None
    assert result["peak_day"] == "mon"
    assert result["peak_revenue_day"] == "fri"


def test_peak_revenue_meal_period_differs_from_primary_meal_period():
    # Lunch has 3 orders (most) but low ticket; dinner has 1 order but high revenue
    rows = [
        _row("L1", _BASE_MON.replace(hour=12), revenue=5.0),
        _row("L2", _BASE_TUE.replace(hour=12), revenue=5.0),
        _row("L3", _BASE_WED.replace(hour=12), revenue=5.0),
        _row("D1", _BASE_MON.replace(hour=19), revenue=200.0),
    ]
    result = compute_operating_profile_from_orders(rows)
    assert result is not None
    assert result["primary_meal_period"] == "lunch"
    assert result["peak_revenue_meal_period"] == "dinner"


# ---------------------------------------------------------------------------
# revenue_share in DayOfWeekRow
# ---------------------------------------------------------------------------


def test_dow_row_has_revenue_share():
    rows = [
        _row("M1", _BASE_MON.replace(hour=12), revenue=30.0),
        _row("T1", _BASE_TUE.replace(hour=12), revenue=70.0),
    ]
    result = compute_operating_profile_from_orders(rows)
    assert result is not None
    mon_row = next(r for r in result["day_of_week_breakdown"] if r["day"] == "mon")
    tue_row = next(r for r in result["day_of_week_breakdown"] if r["day"] == "tue")
    assert "revenue_share" in mon_row
    assert abs(mon_row["revenue_share"] - 0.30) < 1e-4
    assert abs(tue_row["revenue_share"] - 0.70) < 1e-4


def test_dow_revenue_shares_sum_to_one():
    rows = [
        _row("M1", _BASE_MON.replace(hour=12), revenue=20.0),
        _row("T1", _BASE_TUE.replace(hour=12), revenue=30.0),
        _row("S1", _BASE_SAT.replace(hour=12), revenue=50.0),
    ]
    result = compute_operating_profile_from_orders(rows)
    assert result is not None
    total = sum(r["revenue_share"] for r in result["day_of_week_breakdown"])
    assert abs(total - 1.0) < 1e-4


# ---------------------------------------------------------------------------
# avg_revenue_per_order in MealPeriodRow
# ---------------------------------------------------------------------------


def test_meal_period_row_has_avg_revenue_per_order():
    rows = [
        _row("L1", _BASE_MON.replace(hour=12), revenue=20.0),
        _row("L2", _BASE_TUE.replace(hour=12), revenue=40.0),
        _row("D1", _BASE_MON.replace(hour=19), revenue=100.0),
    ]
    result = compute_operating_profile_from_orders(rows)
    assert result is not None
    lunch_row = next(r for r in result["meal_period_breakdown"] if r["period"] == "lunch")
    dinner_row = next(r for r in result["meal_period_breakdown"] if r["period"] == "dinner")
    assert "avg_revenue_per_order" in lunch_row
    assert abs(lunch_row["avg_revenue_per_order"] - 30.0) < 1e-4
    assert abs(dinner_row["avg_revenue_per_order"] - 100.0) < 1e-4


def test_meal_period_avg_revenue_zero_when_no_orders():
    rows = [_row("L1", _BASE_MON.replace(hour=12), revenue=10.0)]
    result = compute_operating_profile_from_orders(rows)
    assert result is not None
    dinner_row = next(r for r in result["meal_period_breakdown"] if r["period"] == "dinner")
    assert dinner_row["avg_revenue_per_order"] == 0.0


# ---------------------------------------------------------------------------
# Top-level avg_revenue_per_order
# ---------------------------------------------------------------------------


def test_avg_revenue_per_order_top_level():
    rows = [
        _row("B1", _BASE_MON.replace(hour=12), revenue=20.0),
        _row("B2", _BASE_TUE.replace(hour=12), revenue=40.0),
    ]
    result = compute_operating_profile_from_orders(rows)
    assert result is not None
    assert abs(result["avg_revenue_per_order"] - 30.0) < 1e-4


# ---------------------------------------------------------------------------
# avg_active_days_per_week
# ---------------------------------------------------------------------------


def test_avg_active_days_per_week_seven_days_in_one_week():
    # All 7 days of one week active → avg = 7.0
    rows = [
        _row("M", _BASE_MON.replace(hour=12)),
        _row("T", _BASE_TUE.replace(hour=12)),
        _row("W", _BASE_WED.replace(hour=12)),
        _row("TH", _BASE_THU.replace(hour=12)),
        _row("F", _BASE_FRI.replace(hour=12)),
        _row("SA", _BASE_SAT.replace(hour=12)),
        _row("SU", _BASE_SUN.replace(hour=12)),
    ]
    result = compute_operating_profile_from_orders(rows)
    assert result is not None
    assert result["avg_active_days_per_week"] <= 7.0


def test_avg_active_days_per_week_five_days_over_two_weeks():
    # Mon–Fri of week 1, Mon–Fri of week 2 → 10 active days over 11 calendar days
    week2_mon = datetime(2024, 6, 10)
    week2_fri = datetime(2024, 6, 14)
    rows = (
        [_row(f"W1{i}", _BASE_MON.replace(hour=12) + (datetime(2024, 6, 3 + i) - _BASE_MON), 10.0) for i in range(5)]
        + [_row("W2M", week2_mon.replace(hour=12), 10.0)]
        + [_row("W2F", week2_fri.replace(hour=12), 10.0)]
    )
    result = compute_operating_profile_from_orders(rows)
    assert result is not None
    assert result["avg_active_days_per_week"] > 0
    assert result["avg_active_days_per_week"] <= 7.0


# ---------------------------------------------------------------------------
# Dining focus classifier
# ---------------------------------------------------------------------------


def test_lunch_spot():
    # 5 lunch orders at 12:00, 1 dinner order at 19:00 → lunch >= 0.50
    rows = [
        _row(f"L{i}", _BASE_MON.replace(hour=12)) for i in range(5)
    ] + [
        _row("D1", _BASE_MON.replace(hour=19)),
    ]
    result = compute_operating_profile_from_orders(rows)
    assert result is not None
    assert result["primary_meal_period"] == "lunch"
    assert result["dining_focus"] == "lunch_spot"
    assert "lunch" in result["active_meal_periods"]


def test_dinner_restaurant():
    rows = [
        _row(f"D{i}", _BASE_MON.replace(hour=19)) for i in range(5)
    ] + [
        _row("L1", _BASE_MON.replace(hour=12)),
    ]
    result = compute_operating_profile_from_orders(rows)
    assert result is not None
    assert result["primary_meal_period"] == "dinner"
    assert result["dining_focus"] == "dinner_restaurant"


def test_breakfast_cafe():
    rows = [
        _row(f"B{i}", _BASE_MON.replace(hour=8)) for i in range(4)
    ] + [
        _row("X1", _BASE_MON.replace(hour=12)),
        _row("X2", _BASE_MON.replace(hour=12)),
        _row("X3", _BASE_MON.replace(hour=12)),
        _row("X4", _BASE_MON.replace(hour=19)),
        _row("X5", _BASE_MON.replace(hour=19)),
        _row("X6", _BASE_MON.replace(hour=19)),
    ]
    # 4 breakfast, 3 lunch, 3 dinner → breakfast=0.4 → breakfast_cafe
    result = compute_operating_profile_from_orders(rows)
    assert result is not None
    assert result["dining_focus"] == "breakfast_cafe"


def test_lunch_and_dinner():
    # 4 lunch + 4 dinner = 8/10 → 0.8 together, neither alone >= 0.5
    rows = (
        [_row(f"L{i}", _BASE_MON.replace(hour=12)) for i in range(4)]
        + [_row(f"D{i}", _BASE_MON.replace(hour=19)) for i in range(4)]
        + [_row("A1", _BASE_MON.replace(hour=15))]
        + [_row("A2", _BASE_MON.replace(hour=15))]
    )
    result = compute_operating_profile_from_orders(rows)
    assert result is not None
    # lunch=4/10=0.4, dinner=4/10=0.4, together=0.8 → lunch_and_dinner
    assert result["dining_focus"] == "lunch_and_dinner"


def test_breakfast_and_lunch():
    # 7 breakfast (0.35) + 8 lunch (0.40) + 2 dinner (0.10) + 3 afternoon (0.15)
    # breakfast < 0.40, lunch < 0.50, breakfast+lunch = 0.75 >= 0.70, dinner = 0.10 < 0.20
    rows = (
        [_row(f"B{i}", _BASE_MON.replace(hour=8)) for i in range(7)]
        + [_row(f"L{i}", _BASE_TUE.replace(hour=12)) for i in range(8)]
        + [_row(f"D{i}", _BASE_WED.replace(hour=19)) for i in range(2)]
        + [_row(f"A{i}", _BASE_THU.replace(hour=15)) for i in range(3)]
    )
    result = compute_operating_profile_from_orders(rows)
    assert result is not None
    assert result["dining_focus"] == "breakfast_and_lunch"


def test_afternoon_cafe():
    # 3 afternoon + 1 lunch: afternoon = 3/4 = 0.75 >= 0.30
    rows = (
        [_row(f"A{i}", _BASE_MON.replace(hour=15)) for i in range(3)]
        + [_row("L1", _BASE_TUE.replace(hour=12))]
    )
    result = compute_operating_profile_from_orders(rows)
    assert result is not None
    assert result["dining_focus"] == "afternoon_cafe"


def test_late_night_venue():
    # 3 late-night + 1 dinner: late_night = 3/4 = 0.75 >= 0.30
    rows = (
        [_row(f"LN{i}", _BASE_MON.replace(hour=23)) for i in range(3)]
        + [_row("D1", _BASE_TUE.replace(hour=19))]
    )
    result = compute_operating_profile_from_orders(rows)
    assert result is not None
    assert result["dining_focus"] == "late_night_venue"


# ---------------------------------------------------------------------------
# Structural integrity
# ---------------------------------------------------------------------------


def test_day_of_week_breakdown_is_complete():
    rows = [_row("B1", _BASE_MON.replace(hour=12))]
    result = compute_operating_profile_from_orders(rows)
    assert result is not None
    days = [r["day"] for r in result["day_of_week_breakdown"]]
    assert days == ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]


def test_day_type_breakdown_has_both_types_by_default():
    rows = [_row("B1", _BASE_MON.replace(hour=12))]
    result = compute_operating_profile_from_orders(rows)
    assert result is not None
    types = {r["type"] for r in result["day_type_breakdown"]}
    assert types == {"weekday", "weekend"}


def test_meal_period_breakdown_covers_all_periods():
    rows = [_row("B1", _BASE_MON.replace(hour=12))]
    result = compute_operating_profile_from_orders(rows)
    assert result is not None
    periods = [r["period"] for r in result["meal_period_breakdown"]]
    assert set(periods) == {"breakfast", "lunch", "afternoon", "dinner", "late_night"}


def test_peak_day():
    rows = [
        _row("M1", _BASE_MON.replace(hour=12)),
        _row("M2", _BASE_MON.replace(hour=13)),
        _row("M3", _BASE_MON.replace(hour=14)),
        _row("F1", _BASE_FRI.replace(hour=12)),
    ]
    result = compute_operating_profile_from_orders(rows)
    assert result is not None
    assert result["peak_day"] == "mon"


def test_total_orders_counts_unique_bills():
    rows = [
        _row("SAME", _BASE_MON.replace(hour=12), 5.0),
        _row("SAME", _BASE_MON.replace(hour=12), 5.0),
        _row("OTHER", _BASE_TUE.replace(hour=12), 10.0),
    ]
    result = compute_operating_profile_from_orders(rows)
    assert result is not None
    assert result["total_orders"] == 2
    assert abs(result["total_revenue"] - 20.0) < 1e-4


def test_avg_order_size():
    # Bill A: 2 line items (qty 1 + 3 = 4 items), Bill B: 1 line item (qty 2)
    # total_items = 4 + 2 = 6, total_orders = 2, avg_order_size = 3.0
    rows = [
        _row("A", _BASE_MON.replace(hour=12), 10.0, qty=1),
        _row("A", _BASE_MON.replace(hour=12), 15.0, qty=3),
        _row("B", _BASE_TUE.replace(hour=12), 20.0, qty=2),
    ]
    result = compute_operating_profile_from_orders(rows)
    assert result is not None
    assert result["total_orders"] == 2
    assert abs(result["avg_order_size"] - 3.0) < 1e-4


def test_avg_order_size_defaults_to_one_when_qty_absent():
    # Rows without qty: each line counts as 1 item (backward compat)
    rows = [
        {"bill_number": "B1", "order_time": _BASE_MON.replace(hour=12), "total_after_bill_discount": 10.0},
        {"bill_number": "B1", "order_time": _BASE_MON.replace(hour=12), "total_after_bill_discount": 5.0},
        {"bill_number": "B2", "order_time": _BASE_TUE.replace(hour=12), "total_after_bill_discount": 15.0},
    ]
    result = compute_operating_profile_from_orders(rows)
    assert result is not None
    assert result["total_orders"] == 2
    assert result["avg_order_size"] == 1.5  # 3 items / 2 bills


def test_active_meal_periods_threshold():
    # 19 lunch orders, 1 dinner order → dinner share = 0.05 (exactly threshold), included
    rows = (
        [_row(f"L{i}", _BASE_MON.replace(hour=12)) for i in range(19)]
        + [_row("D1", _BASE_TUE.replace(hour=19))]
    )
    result = compute_operating_profile_from_orders(rows)
    assert result is not None
    assert "lunch" in result["active_meal_periods"]
    assert "dinner" in result["active_meal_periods"]
    assert "breakfast" not in result["active_meal_periods"]


def test_late_night_hour_bucket():
    rows = [_row("LN1", _BASE_MON.replace(hour=23))]
    result = compute_operating_profile_from_orders(rows)
    assert result is not None
    assert result["primary_meal_period"] == "late_night"


def test_early_morning_late_night_bucket():
    rows = [_row("LN2", _BASE_TUE.replace(hour=2))]
    result = compute_operating_profile_from_orders(rows)
    assert result is not None
    assert result["primary_meal_period"] == "late_night"
