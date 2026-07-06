"""Order metrics payload for GraphQL."""

from __future__ import annotations

from typing import Any

import strawberry
from menuyukti.core.analytics import (
    compute_sales_analytics_from_orders,
    compute_slot_demand_profile_from_orders,
)
from sqlalchemy.orm import Session

from graphql.data_sources import AnalyticsRun
from graphql.services.order_fact_rows import (
    facts_to_combo_timing_rows,
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
    """Return average order size/revenue and venue slot demand profile."""
    facts = order_facts if order_facts is not None else load_order_facts(session, run.id, info=info)
    slot_demand_profile = (
        compute_slot_demand_profile_from_orders(facts_to_combo_timing_rows(facts))
        if facts
        else []
    )

    if not facts:
        return {
            "avg_order_size": 0.0,
            "avg_order_revenue": 0.0,
            "slot_demand_profile": slot_demand_profile,
        }

    sales_analytics = compute_sales_analytics_from_orders(facts_to_sales_analytics_rows(facts))
    order_signals = sales_analytics["additional_signals"]["order_signals"]
    if order_signals is None:
        return {
            "avg_order_size": 0.0,
            "avg_order_revenue": 0.0,
            "slot_demand_profile": slot_demand_profile,
        }

    return {
        "avg_order_size": float(order_signals["avg_order_items"]),
        "avg_order_revenue": float(order_signals["avg_order_revenue"]),
        "slot_demand_profile": slot_demand_profile,
    }
