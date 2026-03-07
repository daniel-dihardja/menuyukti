"""Unit tests for menu engineering matrix calculation."""

import pytest

import pandas as pd

from menuyukti.core.analytics.calculate_menu_engineering_matrix import (
    calculate_menu_engineering_matrix,
    compute_menu_engineering_from_orders,
)


def test_compute_from_orders_empty_raises():
    """Empty order_rows raises ValueError."""
    with pytest.raises(ValueError, match="order_rows must not be empty"):
        compute_menu_engineering_from_orders([], {"A": 1.0})


def test_matrix_all_cogs_zero_raises():
    """All cogs zero (or no revenue) leads to ValueError from calculate_menu_engineering_matrix."""
    order_rows = [
        {"menu": "A", "qty": 2, "total_after_bill_discount": 10.0},
    ]
    cogs_by_menu = {"A": 0.0}
    with pytest.raises(ValueError, match="No valid menu items with cogs > 0 and revenue > 0"):
        compute_menu_engineering_from_orders(order_rows, cogs_by_menu)


def test_matrix_single_item_returns_one_category():
    """Single item with cogs and revenue yields one category and one item in result."""
    order_rows = [
        {"menu": "Solo", "qty": 5, "total_after_bill_discount": 100.0},
    ]
    cogs_by_menu = {"Solo": 10.0}
    result = compute_menu_engineering_from_orders(order_rows, cogs_by_menu)
    assert len(result["items"]) == 1
    assert result["items"][0]["menu"] == "Solo"
    assert result["items"][0]["category"] in ("star", "plow_horse", "puzzle", "low_end")
    assert result["items"][0]["quantity"] == 5
    assert result["items"][0]["total_revenue"] == 100.0
    assert result["items"][0]["cogs"] == 10.0
    assert result["thresholds"]["avg_popularity"] == 5.0
    assert len(result["distribution"]) == 1


def test_matrix_four_quadrants_and_actions():
    """Four items with tuned qty/revenue/cogs produce star, plow_horse, puzzle, low_end and multiple actions."""
    order_rows = [
        {"menu": "StarItem", "qty": 5, "total_after_bill_discount": 100.0},
        {"menu": "PlowHorseItem", "qty": 5, "total_after_bill_discount": 30.0},
        {"menu": "PuzzleItem", "qty": 1, "total_after_bill_discount": 50.0},
        {"menu": "LowEndItem", "qty": 1, "total_after_bill_discount": 5.5},
    ]
    cogs_by_menu = {
        "StarItem": 5.0,
        "PlowHorseItem": 5.0,
        "PuzzleItem": 5.0,
        "LowEndItem": 5.0,
    }
    result = compute_menu_engineering_from_orders(order_rows, cogs_by_menu)

    categories = {item["menu"]: item["category"] for item in result["items"]}
    actions = {item["menu"]: item["action"] for item in result["items"]}

    assert categories["StarItem"] == "star"
    assert categories["PlowHorseItem"] == "plow_horse"
    assert categories["PuzzleItem"] == "puzzle"
    assert categories["LowEndItem"] == "low_end"

    assert actions["StarItem"] == "keep"
    assert actions["LowEndItem"] == "remove"
    assert actions["PuzzleItem"] == "promote"
    assert actions["PlowHorseItem"] in ("keep", "reprice")

    assert len(result["distribution"]) == 4
    dist_cats = {d["category"] for d in result["distribution"]}
    assert dist_cats == {"star", "plow_horse", "puzzle", "low_end"}


def test_calculate_menu_engineering_matrix_missing_columns_raises():
    """Missing required columns raises ValueError."""
    df = pd.DataFrame([{"menu": "A", "quantity": 1}])  # missing total_revenue
    with pytest.raises(ValueError, match="Missing required columns"):
        calculate_menu_engineering_matrix(df)
