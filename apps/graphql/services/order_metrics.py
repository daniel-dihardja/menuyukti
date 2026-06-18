"""Order metrics payload for GraphQL."""

from __future__ import annotations

from typing import Any

import strawberry
from menuyukti.core.analytics import (
    compute_order_metrics_by_day_from_orders,
    compute_sales_analytics_from_orders,
)
from sqlalchemy.orm import Session

from graphql.data_sources import AnalyticsRun
from graphql.services.order_fact_rows import (
    facts_to_operating_profile_rows,
    facts_to_sales_analytics_rows,
)
from graphql.services.order_facts import load_order_facts


def build_order_metrics(
    session: Session,
    run: AnalyticsRun,
    *,
    info: strawberry.Info | None = None,
    order_facts: list | None = None,
) -> dict[str, Any]:
    """Return average order size/revenue and per-weekday breakdown."""
    facts = order_facts if order_facts is not None else load_order_facts(session, run.id, info=info)
    by_day_rows = compute_order_metrics_by_day_from_orders(facts_to_operating_profile_rows(facts))
    by_day_of_week = [
        {
            "day": r["day"],
            "avg_order_size": float(r["avg_order_size"]),
            "avg_order_revenue": float(r["avg_order_revenue"]),
        }
        for r in by_day_rows
    ]

    if not facts:
        return {
            "avg_order_size": 0.0,
            "avg_order_revenue": 0.0,
            "by_day_of_week": by_day_of_week,
        }

    sales_analytics = compute_sales_analytics_from_orders(facts_to_sales_analytics_rows(facts))
    order_signals = sales_analytics["additional_signals"]["order_signals"]
    if order_signals is None:
        return {
            "avg_order_size": 0.0,
            "avg_order_revenue": 0.0,
            "by_day_of_week": by_day_of_week,
        }

    return {
        "avg_order_size": float(order_signals["avg_order_items"]),
        "avg_order_revenue": float(order_signals["avg_order_revenue"]),
        "by_day_of_week": by_day_of_week,
    }
