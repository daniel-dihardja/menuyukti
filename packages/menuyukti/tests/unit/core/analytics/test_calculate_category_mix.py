"""Unit tests for category mix analytics."""

import pandas as pd
import pytest

from menuyukti.core.analytics.calculate_category_mix import (
    calculate_category_mix,
    compute_category_mix_from_orders,
)


def test_category_mix_shares_and_top_item():
    df = pd.DataFrame(
        [
            {"menu": "Pasta A", "qty": 2, "total_after_bill_discount": 20.0, "menu_category": "Pasta"},
            {"menu": "Pasta B", "qty": 1, "total_after_bill_discount": 30.0, "menu_category": "Pasta"},
            {"menu": "Salad X", "qty": 3, "total_after_bill_discount": 15.0, "menu_category": "Salads"},
        ]
    )
    result = calculate_category_mix(df)
    assert result["top_revenue_category"] == "Pasta"
    by_cat = {r["category"]: r for r in result["rows"]}
    assert abs(by_cat["Pasta"]["revenue_share"] + by_cat["Salads"]["revenue_share"] - 1.0) < 1e-6
    assert by_cat["Pasta"]["top_item"] == "Pasta B"
    assert by_cat["Salads"]["top_item"] == "Salad X"


def test_category_mix_uncategorized_grouping():
    df = pd.DataFrame(
        [
            {"menu": "A", "qty": 1, "total_after_bill_discount": 10.0, "menu_category": None},
            {"menu": "B", "qty": 1, "total_after_bill_discount": 5.0, "menu_category": ""},
        ]
    )
    result = calculate_category_mix(df)
    assert len(result["rows"]) == 1
    assert result["rows"][0]["category"] == "(uncategorized)"
    assert result["rows"][0]["total_revenue"] == 15.0


def test_category_mix_empty_raises():
    df = pd.DataFrame(columns=["menu", "qty", "total_after_bill_discount"])
    with pytest.raises(ValueError, match="empty"):
        calculate_category_mix(df)


def test_compute_from_orders_delegates():
    rows = [
        {"menu": "M", "qty": 1, "total_after_bill_discount": 5.0, "menu_category": "C"},
    ]
    out = compute_category_mix_from_orders(rows)
    assert len(out["rows"]) == 1
    assert out["rows"][0]["category"] == "C"
