"""Tests for week-level demand indices."""

from __future__ import annotations

from datetime import UTC, datetime

from menuyukti.core.analytics.calculate_weekly_demand_pattern import (
    compute_weekly_demand_pattern_from_orders,
)


def test_compute_weekly_demand_pattern_from_orders_two_weeks() -> None:
    base = datetime(2025, 1, 6, 12, 0, tzinfo=UTC)  # Monday week 2
    rows = [
        {
            "bill_number": "a",
            "order_time": base,
            "total_after_bill_discount": 50.0,
        },
        {
            "bill_number": "b",
            "order_time": base,
            "total_after_bill_discount": 30.0,
        },
        {
            "bill_number": "c",
            "order_time": base.replace(day=13),
            "total_after_bill_discount": 10.0,
        },
    ]
    out = compute_weekly_demand_pattern_from_orders(rows)
    assert len(out) == 2
    assert all("iso_week" in r and "revenue_index" in r for r in out)
