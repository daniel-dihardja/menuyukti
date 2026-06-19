"""Unit tests for combo pair timing calculation."""

from datetime import datetime, timezone

from menuyukti.core.analytics.calculate_combo_pair_timing import (
    MIN_SLOT_CO_ORDERS,
    compute_combo_pair_timing_from_orders,
)


def _row(bill: str, menu: str, order_time: datetime) -> dict:
    return {
        "bill_number": bill,
        "menu": menu,
        "order_time": order_time,
    }


def _dt(year: int, month: int, day: int, hour: int) -> datetime:
    return datetime(year, month, day, hour, 0, 0, tzinfo=timezone.utc)


def test_empty_input_returns_empty():
    assert compute_combo_pair_timing_from_orders([], [{"menu_a": "A", "menu_b": "B"}]) == []


def test_no_co_orders_returns_insufficient_confidence():
    rows = [
        _row("B1", "Burger", _dt(2024, 1, 1, 12)),
        _row("B2", "Fries", _dt(2024, 1, 2, 12)),
    ]
    result = compute_combo_pair_timing_from_orders(
        rows, [{"menu_a": "Burger", "menu_b": "Fries"}]
    )
    assert len(result) == 1
    timing = result[0]
    assert timing["recommended_window"]["confidence_tier"] == "insufficient"
    assert timing["recommended_window"]["best_day"] is None


def test_friday_lunch_cluster_recommended():
    rows: list[dict] = []
    # 5 co-orders on Friday lunch
    for i in range(5):
        rows.append(_row(f"C{i}", "Burger", _dt(2024, 1, 5, 12)))  # Fri
        rows.append(_row(f"C{i}", "Fries", _dt(2024, 1, 5, 12)))
    # Noise on other days
    for i in range(10):
        rows.append(_row(f"O{i}", "Salad", _dt(2024, 1, 1 + (i % 7), 18)))

    result = compute_combo_pair_timing_from_orders(
        rows, [{"menu_a": "Burger", "menu_b": "Fries"}]
    )[0]
    window = result["recommended_window"]
    assert window["best_day"] == "fri"
    assert window["best_meal_period"] == "lunch"
    assert window["best_meal_period_label"] == "Lunch"
    assert window["best_meal_period_hours_label"] == "11:00–14:59"
    assert window["co_order_index"] is not None
    assert window["co_order_index"] > 1.0
    assert window["sample_co_orders"] == 5
    assert window["confidence_tier"] == "medium"


def test_normalization_favors_high_attach_not_just_busy_hours():
    rows: list[dict] = []
    # Busy dinner slot: many orders, only 3 co-orders (minimum)
    for i in range(20):
        rows.append(_row(f"D{i}", "Burger", _dt(2024, 1, 1, 19)))  # Mon dinner
        if i < 3:
            rows.append(_row(f"D{i}", "Fries", _dt(2024, 1, 1, 19)))
    # Quieter lunch slot: 4 co-orders out of 5 burger orders
    for i in range(5):
        rows.append(_row(f"L{i}", "Burger", _dt(2024, 1, 2, 12)))  # Tue lunch
        if i < 4:
            rows.append(_row(f"L{i}", "Fries", _dt(2024, 1, 2, 12)))

    result = compute_combo_pair_timing_from_orders(
        rows, [{"menu_a": "Burger", "menu_b": "Fries"}]
    )[0]
    window = result["recommended_window"]
    assert window["best_day"] == "tue"
    assert window["best_meal_period"] == "lunch"


def test_recommendation_follows_peak_index_not_only_high_volume_slots():
    rows: list[dict] = []
    # Wed breakfast: 2 co-orders, very quiet slot -> high index
    for i in range(2):
        rows.append(_row(f"W{i}", "Burger", _dt(2024, 1, 3, 8)))
        rows.append(_row(f"W{i}", "Fries", _dt(2024, 1, 3, 8)))
    # Thu lunch: 4 co-orders
    for i in range(4):
        rows.append(_row(f"T{i}", "Burger", _dt(2024, 1, 4, 12)))
        rows.append(_row(f"T{i}", "Fries", _dt(2024, 1, 4, 12)))
    # Mon dinner: many orders, 5 co-orders but lower relative index
    for i in range(30):
        rows.append(_row(f"D{i}", "Burger", _dt(2024, 1, 1, 19)))
        if i < 5:
            rows.append(_row(f"D{i}", "Fries", _dt(2024, 1, 1, 19)))

    result = compute_combo_pair_timing_from_orders(
        rows, [{"menu_a": "Burger", "menu_b": "Fries"}]
    )[0]
    window = result["recommended_window"]
    # Peak index should win (likely breakfast or lunch), not default dinner volume.
    assert window["best_meal_period"] in {"breakfast", "lunch"}
    assert window["best_meal_period_label"] in {"Breakfast", "Lunch"}


def test_slots_below_minimum_still_get_low_confidence():
    rows: list[dict] = []
    # Only 2 co-orders on Wed breakfast (below MIN_SLOT_CO_ORDERS)
    for i in range(2):
        rows.append(_row(f"W{i}", "Burger", _dt(2024, 1, 3, 8)))
        rows.append(_row(f"W{i}", "Fries", _dt(2024, 1, 3, 8)))
    # 4 co-orders on Thu lunch
    for i in range(4):
        rows.append(_row(f"T{i}", "Burger", _dt(2024, 1, 4, 12)))
        rows.append(_row(f"T{i}", "Fries", _dt(2024, 1, 4, 12)))

    result = compute_combo_pair_timing_from_orders(
        rows, [{"menu_a": "Burger", "menu_b": "Fries"}]
    )[0]
    window = result["recommended_window"]
    assert window["best_day"] == "thu"
    assert window["confidence_tier"] in {"low", "medium"}
    assert window["sample_co_orders"] == 4


def test_high_confidence_tier_at_ten_plus():
    rows: list[dict] = []
    for i in range(12):
        rows.append(_row(f"H{i}", "Burger", _dt(2024, 1, 5, 12)))
        rows.append(_row(f"H{i}", "Fries", _dt(2024, 1, 5, 12)))

    result = compute_combo_pair_timing_from_orders(
        rows, [{"menu_a": "Burger", "menu_b": "Fries"}]
    )[0]
    assert result["recommended_window"]["confidence_tier"] == "high"
    assert result["recommended_window"]["sample_co_orders"] == 12
