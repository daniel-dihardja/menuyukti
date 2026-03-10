"""Unit tests for compute_operating_profile_from_orders.

All tests use inline order rows — no DB or file fixtures required.
"""

from datetime import datetime

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
    # 3 weekday, 2 weekend → 60% weekday, 40% weekend → all_week (weekday 0.40–0.64 is weekend_leaning... wait)
    # Let me recalculate: weekday_share=0.6, weekend_share=0.4
    # operating_pattern thresholds:
    #   weekday_only >= 0.95: no
    #   weekday_leaning >= 0.65: no (0.6 < 0.65)
    #   weekend_focused >= 0.60: no (weekend=0.4)
    #   weekend_leaning >= 0.40: yes (weekend=0.4)
    # So this is weekend_leaning. Let's use 57%/43% for all_week
    # weekday=4, weekend=3 → 4/7=0.571 → all_week (not >= 0.65, weekend not >= 0.40... 3/7=0.428 >= 0.40 → weekend_leaning)
    # For all_week we need weekend_share < 0.40, weekday_share < 0.65
    # weekday=3, weekend=2 → 3/5=0.60, weekend=2/5=0.40 → weekend_leaning
    # weekday=3, weekend=1 → 3/4=0.75 → weekday_leaning
    # Actually: all_week = weekday < 0.65 AND weekend < 0.40
    # 0.60 weekday, 0.38 weekend → need 3 weekday, ~1.9 weekend → not integer
    # Let's use: 8 weekday, 5 weekend → 8/13=0.615 weekday, 5/13=0.385 weekend → all_week
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
# Meal period / dining focus classification
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


# ---------------------------------------------------------------------------
# Structural integrity
# ---------------------------------------------------------------------------


def test_day_of_week_breakdown_is_complete():
    rows = [_row("B1", _BASE_MON.replace(hour=12))]
    result = compute_operating_profile_from_orders(rows)
    assert result is not None
    days = [r["day"] for r in result["day_of_week_breakdown"]]
    assert days == ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]


def test_day_type_breakdown_has_both_types():
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
