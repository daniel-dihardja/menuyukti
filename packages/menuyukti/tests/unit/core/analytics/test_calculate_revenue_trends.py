"""Unit tests for revenue trend analytics."""

import pandas as pd
import pytest

from menuyukti.core.analytics.calculate_revenue_trends import (
    calculate_revenue_trends,
    compute_revenue_trends_from_orders,
)


def test_revenue_trends_rising_and_totals():
    curr = pd.DataFrame(
        [
            {"menu": "A", "total_after_bill_discount": 110.0},
            {"menu": "B", "total_after_bill_discount": 50.0},
        ]
    )
    prev = pd.DataFrame(
        [
            {"menu": "A", "total_after_bill_discount": 100.0},
            {"menu": "B", "total_after_bill_discount": 50.0},
        ]
    )
    result = calculate_revenue_trends(curr, prev)
    assert result["current_period_total_revenue"] == 160.0
    assert result["previous_period_total_revenue"] == 150.0
    by_menu = {r["menu"]: r for r in result["rows"]}
    assert by_menu["A"]["trend_label"] == "rising"
    assert by_menu["A"]["pct_change"] is not None
    assert abs(by_menu["A"]["pct_change"] - 0.1) < 1e-6
    assert by_menu["B"]["trend_label"] == "stable"


def test_revenue_trends_new_entry():
    curr = pd.DataFrame([{"menu": "New", "total_after_bill_discount": 40.0}])
    prev = pd.DataFrame([{"menu": "Old", "total_after_bill_discount": 50.0}])
    result = calculate_revenue_trends(curr, prev)
    by_menu = {r["menu"]: r for r in result["rows"]}
    assert by_menu["New"]["trend_label"] == "new_entry"
    assert by_menu["New"]["pct_change"] is None


def test_revenue_trends_declining():
    curr = pd.DataFrame([{"menu": "X", "total_after_bill_discount": 50.0}])
    prev = pd.DataFrame([{"menu": "X", "total_after_bill_discount": 100.0}])
    result = calculate_revenue_trends(curr, prev)
    row = next(r for r in result["rows"] if r["menu"] == "X")
    assert row["trend_label"] == "declining"


def test_revenue_trends_current_empty_raises():
    cols = ["menu", "total_after_bill_discount"]
    empty = pd.DataFrame(columns=cols)
    with pytest.raises(ValueError, match="empty"):
        calculate_revenue_trends(empty, empty)


def test_compute_from_orders_empty_previous():
    curr = [{"menu": "A", "total_after_bill_discount": 10.0}]
    result = compute_revenue_trends_from_orders(curr, [])
    assert result["previous_period_total_revenue"] == 0.0
    assert any(r["menu"] == "A" and r["trend_label"] == "new_entry" for r in result["rows"])
