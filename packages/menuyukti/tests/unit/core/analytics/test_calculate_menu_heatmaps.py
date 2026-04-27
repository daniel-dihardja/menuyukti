"""Unit tests for menu heatmap calculation."""

from datetime import datetime

import pandas as pd

from menuyukti.core.analytics.calculate_menu_heatmaps import (
    WEEKDAY_ORDER,
    calculate_menu_heatmaps,
    compute_menu_heatmaps_from_orders,
)


def test_compute_menu_heatmaps_from_orders_empty():
    """Empty input returns []."""
    assert compute_menu_heatmaps_from_orders([]) == []


def test_calculate_menu_heatmaps_empty_dataframe():
    """Empty DataFrame returns []."""
    df = pd.DataFrame(columns=["menu", "qty", "order_time", "menu_category", "menu_category_detail"])
    assert calculate_menu_heatmaps(df) == []


def test_heatmaps_two_menus_different_hours():
    """Two menus with orders in different hours produce correct daily and weekly buckets."""
    base = datetime(2024, 6, 3, 12, 0, 0)  # Monday
    order_rows = [
        {"menu": "Burger", "qty": 2, "order_time": base, "menu_category": "Mains", "menu_category_detail": None},
        {"menu": "Burger", "qty": 1, "order_time": base.replace(hour=14), "menu_category": "Mains", "menu_category_detail": None},
        {"menu": "Fries", "qty": 3, "order_time": base.replace(hour=12), "menu_category": "Sides", "menu_category_detail": None},
    ]
    result = compute_menu_heatmaps_from_orders(order_rows)

    assert len(result) == 2
    by_menu = {p["menu"]: p for p in result}
    assert "Burger" in by_menu
    assert "Fries" in by_menu

    burger = by_menu["Burger"]
    assert len(burger["daily_heatmap"]) == 24
    assert burger["daily_heatmap"][12]["quantity"] == 2
    assert burger["daily_heatmap"][14]["quantity"] == 1
    assert sum(r["quantity"] for r in burger["daily_heatmap"]) == 3

    assert len(burger["weekly_heatmap"]) == 7
    mon_qty = next(r["quantity"] for r in burger["weekly_heatmap"] if r["day"] == "mon")
    assert mon_qty == 3

    fries = by_menu["Fries"]
    assert fries["daily_heatmap"][12]["quantity"] == 3
    assert sum(r["quantity"] for r in fries["daily_heatmap"]) == 3


def test_heatmaps_structure_and_sort_order():
    """Result has daily_heatmap (24 hours), weekly_heatmap (7 days), sorted by total quantity then menu name."""
    base = datetime(2024, 6, 5, 10, 0, 0)
    order_rows = [
        {"menu": "A", "qty": 1, "order_time": base, "menu_category": None, "menu_category_detail": None},
        {"menu": "B", "qty": 2, "order_time": base, "menu_category": None, "menu_category_detail": None},
    ]
    result = compute_menu_heatmaps_from_orders(order_rows)

    assert len(result) == 2
    assert result[0]["menu"] == "B"
    assert result[1]["menu"] == "A"
    for payload in result:
        assert len(payload["daily_heatmap"]) == 24
        assert all("hour" in r and "quantity" in r for r in payload["daily_heatmap"])
        assert [r["day"] for r in payload["weekly_heatmap"]] == WEEKDAY_ORDER
        assert "reporting_period" in payload
