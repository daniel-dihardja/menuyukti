"""Unit tests for per-slot menu promotion candidates."""

from datetime import datetime, timezone

import pytest

from menuyukti.core.analytics.calculate_menu_engineering_matrix import (
    compute_menu_engineering_from_orders,
)
from menuyukti.core.analytics.calculate_slot_menu_candidates import (
    compute_slot_menu_candidates,
)


def _dt(year: int, month: int, day: int, hour: int) -> datetime:
    return datetime(year, month, day, hour, 0, 0, tzinfo=timezone.utc)


def _combo_row(bill: str, when: datetime) -> dict:
    return {"bill_number": bill, "order_time": when}


def _menu_row(menu: str, qty: int, when: datetime, revenue: float) -> dict:
    return {
        "menu": menu,
        "qty": qty,
        "order_time": when,
        "total_after_bill_discount": revenue,
    }


def _build_many_tue_lunch_orders(count: int) -> tuple[list[dict], list[dict]]:
    """Enough Tue lunch bills for venue threshold + menu lines."""
    combo: list[dict] = []
    menus: list[dict] = []
    tue_lunch = _dt(2025, 6, 3, 12)  # Tuesday
    for i in range(count):
        combo.append(_combo_row(f"B{i}", tue_lunch))
        menus.append(_menu_row("TueLunchStar", 2, tue_lunch, 20.0))
    return combo, menus


def test_compute_slot_menu_candidates_empty_raises():
    with pytest.raises(ValueError, match="order_rows must not be empty"):
        compute_slot_menu_candidates([], [], {})


def test_insufficient_data_when_venue_orders_below_threshold():
    combo, menus = _build_many_tue_lunch_orders(3)
    cogs = {"TueLunchStar": 2.0}
    result = compute_slot_menu_candidates(
        menus,
        combo,
        cogs,
        options={"min_venue_orders_in_slot": 8},
    )
    tue_lunch = next(
        c for c in result["slots"] if c["day"] == "tue" and c["meal_period"] == "lunch"
    )
    assert tue_lunch["insufficient_data"] is True
    assert tue_lunch["candidates"] == []
    assert any("below minimum" in note for note in result["coverage_notes"])


def test_tue_lunch_high_slot_affinity():
    combo, menus = _build_many_tue_lunch_orders(10)
    # Same item also sells on Wed dinner but less
    wed_dinner = _dt(2025, 6, 4, 18)
    for i in range(10, 13):
        combo.append(_combo_row(f"B{i}", wed_dinner))
        menus.append(_menu_row("TueLunchStar", 1, wed_dinner, 10.0))

    cogs = {"TueLunchStar": 2.0}
    result = compute_slot_menu_candidates(
        menus,
        combo,
        cogs,
        options={"min_venue_orders_in_slot": 8, "min_item_qty_in_slot": 2},
    )
    tue_lunch = next(
        c for c in result["slots"] if c["day"] == "tue" and c["meal_period"] == "lunch"
    )
    assert not tue_lunch["insufficient_data"]
    assert len(tue_lunch["candidates"]) >= 1
    top = tue_lunch["candidates"][0]
    assert top["menu"] == "TueLunchStar"
    assert top["slot_affinity"] > 0.5
    assert top["rank"] == 1


def test_low_end_excluded_by_default():
    when = _dt(2025, 6, 3, 12)
    combo = [_combo_row(f"B{i}", when) for i in range(10)]
    menus: list[dict] = []
    for _ in range(10):
        menus.append(_menu_row("StarItem", 5, when, 100.0))
        menus.append(_menu_row("LowEndItem", 5, when, 5.5))
    cogs = {
        "StarItem": 5.0,
        "PlowHorseItem": 5.0,
        "PuzzleItem": 5.0,
        "LowEndItem": 5.0,
    }
    matrix_rows = [
        {"menu": "StarItem", "qty": 5, "total_after_bill_discount": 100.0},
        {"menu": "PlowHorseItem", "qty": 5, "total_after_bill_discount": 30.0},
        {"menu": "PuzzleItem", "qty": 1, "total_after_bill_discount": 50.0},
        {"menu": "LowEndItem", "qty": 1, "total_after_bill_discount": 5.5},
    ]
    matrix = compute_menu_engineering_from_orders(matrix_rows, cogs)
    categories = {item["menu"]: item["category"] for item in matrix["items"]}
    assert categories["LowEndItem"] == "low_end"

    result = compute_slot_menu_candidates(
        menus,
        combo,
        cogs,
        matrix_rows=matrix_rows,
        options={"min_venue_orders_in_slot": 8, "min_item_qty_in_slot": 2},
    )
    tue_lunch = next(
        c for c in result["slots"] if c["day"] == "tue" and c["meal_period"] == "lunch"
    )
    menu_names = {c["menu"] for c in tue_lunch["candidates"]}
    assert "LowEndItem" not in menu_names
    assert "StarItem" in menu_names


def test_slots_filter_priority_excludes_maintain_posture():
    """Evenly spread orders yield average (maintain) slots excluded from priority filter."""
    combo: list[dict] = []
    menus: list[dict] = []
    slot_index = 0
    days = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]
    periods = ["breakfast", "lunch", "afternoon", "dinner", "late_night"]
    for day_i, day in enumerate(days):
        for period_i, period in enumerate(periods):
            hour_map = {
                "breakfast": 8,
                "lunch": 12,
                "afternoon": 15,
                "dinner": 18,
                "late_night": 23,
            }
            when = _dt(2025, 6, 2 + day_i, hour_map[period])
            combo.append(_combo_row(f"B{slot_index}", when))
            menus.append(_menu_row("Item", 3, when, 30.0))
            slot_index += 1

    all_slots = compute_slot_menu_candidates(
        menus,
        combo,
        {"Item": 2.0},
        options={"slots_filter": "all"},
    )
    priority = compute_slot_menu_candidates(
        menus,
        combo,
        {"Item": 2.0},
        options={"slots_filter": "priority"},
    )
    assert len(all_slots["slots"]) == 35
    maintain_count = sum(1 for s in all_slots["slots"] if s["posture"] == "maintain")
    assert maintain_count > 0
    assert len(priority["slots"]) == 35 - maintain_count
    assert all(s["posture"] in ("promote", "support") for s in priority["slots"])


def test_matrix_unavailable_still_returns_slot_ranked_candidates():
    when = _dt(2025, 6, 3, 12)
    combo = [_combo_row(f"B{i}", when) for i in range(10)]
    menus = [_menu_row("NoCogsItem", 4, when, 40.0) for _ in range(10)]

    result = compute_slot_menu_candidates(
        menus,
        combo,
        {},
        options={"min_venue_orders_in_slot": 8},
    )
    assert result["matrix_available"] is False
    tue_lunch = next(
        c for c in result["slots"] if c["day"] == "tue" and c["meal_period"] == "lunch"
    )
    assert len(tue_lunch["candidates"]) == 1
    assert tue_lunch["candidates"][0]["global_category"] is None


def test_max_candidates_per_slot_respected():
    when = _dt(2025, 6, 3, 12)
    combo = [_combo_row(f"B{i}", when) for i in range(10)]
    menus: list[dict] = []
    for name in ("A", "B", "C", "D", "E", "F"):
        menus.append(_menu_row(name, 5, when, 50.0))

    result = compute_slot_menu_candidates(
        menus,
        combo,
        {name: 2.0 for name in ("A", "B", "C", "D", "E", "F")},
        options={
            "min_venue_orders_in_slot": 8,
            "min_item_qty_in_slot": 2,
            "max_candidates_per_slot": 3,
        },
    )
    tue_lunch = next(
        c for c in result["slots"] if c["day"] == "tue" and c["meal_period"] == "lunch"
    )
    assert len(tue_lunch["candidates"]) == 3
