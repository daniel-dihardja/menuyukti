"""Unit tests for menu basket affinity calculation."""

import pandas as pd

from menuyukti.core.analytics.calculate_menu_basket_affinities import (
    MIN_CO_OCCURRENCE,
    compute_menu_basket_affinities_from_orders,
)


def _row(bill: str, menu: str, category: str | None = None) -> dict:
    return {
        "bill_number": bill,
        "menu": menu,
        "menu_category": category,
    }


def test_empty_input_returns_structured_empty():
    result = compute_menu_basket_affinities_from_orders([])
    assert result["total_orders"] == 0
    assert result["pairs"] == []
    assert result["matrix_lift"] == []


def test_single_item_orders_produce_no_pairs():
    rows = [
        _row("B1", "Burger"),
        _row("B2", "Fries"),
        _row("B3", "Salad"),
    ]
    result = compute_menu_basket_affinities_from_orders(rows)
    assert result["total_orders"] == 3
    assert result["multi_item_order_count"] == 0
    assert result["pairs"] == []


def test_correlated_pair_has_lift_above_one():
    rows = []
    for i in range(10):
        rows.append(_row(f"B{i}", "Burger", "Mains"))
        rows.append(_row(f"B{i}", "Fries", "Sides"))
    for i in range(10, 20):
        rows.append(_row(f"B{i}", "Salad", "Mains"))

    result = compute_menu_basket_affinities_from_orders(
        rows,
        focus_menus=["Burger", "Fries", "Salad"],
    )
    assert result["scope"] == "stars"
    assert result["multi_item_order_count"] == 10
    burger_fries = next(
        (p for p in result["pairs"] if p["menu_a"] == "Burger" and p["menu_b"] == "Fries"),
        None,
    )
    assert burger_fries is not None
    assert burger_fries["co_order_count"] == 10
    assert burger_fries["lift"] > 1.0


def test_focus_menus_limits_pairs_to_focus_set():
    rows = []
    for i in range(MIN_CO_OCCURRENCE):
        rows.append(_row(f"B{i}", "Burger"))
        rows.append(_row(f"B{i}", "Fries"))
        rows.append(_row(f"B{i}", "Cola"))
    result = compute_menu_basket_affinities_from_orders(rows, focus_menus=["Burger", "Fries"])
    menus_in_pairs = {
        menu for p in result["pairs"] for menu in (p["menu_a"], p["menu_b"])
    }
    assert menus_in_pairs <= {"Burger", "Fries"}
    assert "Cola" not in menus_in_pairs


def test_top_by_presence_when_no_focus_menus():
    rows = []
    for i in range(MIN_CO_OCCURRENCE):
        rows.append(_row(f"B{i}", "Alpha"))
        rows.append(_row(f"B{i}", "Beta"))
    result = compute_menu_basket_affinities_from_orders(rows)
    assert result["scope"] == "top_by_presence"
    assert "Alpha" in result["focus_menus"]
    assert "Beta" in result["focus_menus"]


def test_matrix_lift_symmetric_with_null_diagonal():
    rows = []
    for i in range(MIN_CO_OCCURRENCE):
        rows.append(_row(f"B{i}", "A"))
        rows.append(_row(f"B{i}", "B"))
    result = compute_menu_basket_affinities_from_orders(rows, focus_menus=["A", "B"])
    matrix = result["matrix_lift"]
    assert len(matrix) == 2
    assert matrix[0][0] is None
    assert matrix[1][1] is None
    assert matrix[0][1] == matrix[1][0]


def test_matrix_lift_matches_pairs_when_focus_order_not_alphabetical():
    rows = []
    for i in range(MIN_CO_OCCURRENCE):
        rows.append(_row(f"B{i}", "Burger"))
        rows.append(_row(f"B{i}", "Apple"))
    # Star-style focus: high seller first, not alphabetical (Apple < Burger).
    result = compute_menu_basket_affinities_from_orders(rows, focus_menus=["Burger", "Apple"])
    pair = next(
        (p for p in result["pairs"] if p["menu_a"] == "Apple" and p["menu_b"] == "Burger"),
        None,
    )
    assert pair is not None
    matrix = result["matrix_lift"]
    assert matrix[0][1] == pair["lift"]
    assert matrix[1][0] == pair["lift"]


def test_calculate_from_dataframe_empty():
    from menuyukti.core.analytics.calculate_menu_basket_affinities import (
        calculate_menu_basket_affinities,
    )

    df = pd.DataFrame(columns=["bill_number", "menu"])
    result = calculate_menu_basket_affinities(df)
    assert result["total_orders"] == 0
