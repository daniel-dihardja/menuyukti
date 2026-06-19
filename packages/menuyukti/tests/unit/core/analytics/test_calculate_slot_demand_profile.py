"""Unit tests for slot demand profile and combo promo posture."""

from datetime import datetime, timezone

from menuyukti.core.analytics.calculate_combo_pair_timing import (
    MIN_SLOT_CO_ORDERS,
    compute_combo_pair_timing_from_orders,
)
from menuyukti.core.analytics.calculate_slot_demand_profile import (
    LOW_DEMAND_THRESHOLD,
    compute_slot_demand_profile_from_orders,
    derive_combo_promo_posture,
)


def _row(bill: str, menu: str, order_time: datetime) -> dict:
    return {
        "bill_number": bill,
        "menu": menu,
        "order_time": order_time,
    }


def _slot_row(bill: str, order_time: datetime) -> dict:
    return {"bill_number": bill, "order_time": order_time}


def _dt(year: int, month: int, day: int, hour: int) -> datetime:
    return datetime(year, month, day, hour, 0, 0, tzinfo=timezone.utc)


def test_empty_slot_profile_returns_empty():
    assert compute_slot_demand_profile_from_orders([]) == []


def test_slot_profile_returns_35_cells():
    rows = [_slot_row(f"B{i}", _dt(2024, 1, 1 + (i % 7), 12)) for i in range(20)]
    profile = compute_slot_demand_profile_from_orders(rows)
    assert len(profile) == 35


def test_weak_mon_lunch_vs_strong_fri_dinner():
    rows: list[dict] = []
    # Mon lunch: few orders (weak vs average slot)
    for i in range(3):
        rows.append(_slot_row(f"ML{i}", _dt(2024, 1, 1, 12)))
    for i in range(20):
        rows.append(_slot_row(f"MD{i}", _dt(2024, 1, 1, 19)))
    for day in (2, 3, 4, 6, 7):
        for i in range(25):
            rows.append(_slot_row(f"L{day}{i}", _dt(2024, 1, day, 12)))
    for i in range(200):
        rows.append(_slot_row(f"FD{i}", _dt(2024, 1, 5, 19)))

    profile = compute_slot_demand_profile_from_orders(rows)
    by_slot = {(c["day"], c["meal_period"]): c for c in profile}

    mon_lunch = by_slot[("mon", "lunch")]
    fri_dinner = by_slot[("fri", "dinner")]
    assert mon_lunch["demand_index"] < fri_dinner["demand_index"]
    assert mon_lunch["relative_demand"] == "low"
    assert fri_dinner["relative_demand"] == "high"


def test_peak_pair_in_weak_slot_promotes():
    rows: list[dict] = []
    for i in range(5):
        rows.append(_row(f"C{i}", "Burger", _dt(2024, 1, 1, 12)))
        rows.append(_row(f"C{i}", "Fries", _dt(2024, 1, 1, 12)))
    for i in range(20):
        rows.append(_row(f"MD{i}", "Salad", _dt(2024, 1, 1, 19)))
    for day in (2, 3, 4, 6, 7):
        for i in range(25):
            rows.append(_row(f"L{day}{i}", "Salad", _dt(2024, 1, day, 12)))
    for i in range(200):
        rows.append(_row(f"D{i}", "Salad", _dt(2024, 1, 5, 19)))

    profile = compute_slot_demand_profile_from_orders(rows)
    timing = compute_combo_pair_timing_from_orders(
        rows, [{"menu_a": "Burger", "menu_b": "Fries"}]
    )[0]
    posture = derive_combo_promo_posture(timing, profile)

    assert timing["recommended_window"]["best_day"] == "mon"
    assert posture["promo_posture"] == "promote"
    assert posture["venue_relative_demand"] == "low"
    assert "Promote" in posture["promo_reason"]


def test_peak_pair_in_strong_slot_supports():
    rows: list[dict] = []
    for i in range(5):
        rows.append(_row(f"C{i}", "Burger", _dt(2024, 1, 5, 19)))
        rows.append(_row(f"C{i}", "Fries", _dt(2024, 1, 5, 19)))
    for i in range(2):
        rows.append(_row(f"O{i}", "Salad", _dt(2024, 1, 1, 12)))

    profile = compute_slot_demand_profile_from_orders(rows)
    timing = compute_combo_pair_timing_from_orders(
        rows, [{"menu_a": "Burger", "menu_b": "Fries"}]
    )[0]
    posture = derive_combo_promo_posture(timing, profile)

    assert timing["recommended_window"]["best_day"] == "fri"
    assert posture["promo_posture"] == "support"
    assert posture["venue_relative_demand"] == "high"
    assert "Support" in posture["promo_reason"]


def test_sparse_breakfast_slots_stay_below_average():
    """Breakfast with few orders should not show inflated demand indices."""
    rows: list[dict] = []
    for i in range(12):
        rows.append(_slot_row(f"B{i}", _dt(2024, 1, 1 + (i % 7), 8)))
    for i in range(200):
        rows.append(_slot_row(f"L{i}", _dt(2024, 1, 1 + (i % 7), 12)))
    for i in range(300):
        rows.append(_slot_row(f"D{i}", _dt(2024, 1, 1 + (i % 7), 19)))

    profile = compute_slot_demand_profile_from_orders(rows)
    breakfast_cells = [c for c in profile if c["meal_period"] == "breakfast"]

    assert breakfast_cells
    assert all(c["demand_index"] < LOW_DEMAND_THRESHOLD for c in breakfast_cells)
    assert all(c["relative_demand"] == "low" for c in breakfast_cells)
    assert max(c["demand_index"] for c in breakfast_cells) < 1.5


def test_insufficient_co_orders_returns_insufficient_data():
    rows: list[dict] = []
    for i in range(2):
        rows.append(_row(f"C{i}", "Burger", _dt(2024, 1, 5, 12)))
        rows.append(_row(f"C{i}", "Fries", _dt(2024, 1, 5, 12)))

    profile = compute_slot_demand_profile_from_orders(rows)
    timing = compute_combo_pair_timing_from_orders(
        rows, [{"menu_a": "Burger", "menu_b": "Fries"}]
    )[0]
    posture = derive_combo_promo_posture(timing, profile)

    assert timing["recommended_window"]["sample_co_orders"] < MIN_SLOT_CO_ORDERS
    assert posture["promo_posture"] == "insufficient_data"
