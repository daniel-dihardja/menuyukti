"""Category mix payload for GraphQL."""

from __future__ import annotations

from typing import Any

import strawberry
from menuyukti.core.analytics import compute_category_mix_from_orders
from sqlalchemy.orm import Session

from graphql.data_sources import AnalyticsRun
from graphql.services.order_fact_rows import facts_to_category_mix_rows
from graphql.services.order_facts import load_order_facts


def build_category_mix(
    session: Session,
    run: AnalyticsRun,
    *,
    info: strawberry.Info | None = None,
    order_facts: list | None = None,
) -> dict[str, Any] | None:
    """Return category mix rows and top category, or None if no order data."""
    facts = order_facts if order_facts is not None else load_order_facts(session, run.id, info=info)
    if not facts:
        return None

    rows_in = facts_to_category_mix_rows(facts)
    result = compute_category_mix_from_orders(rows_in)

    return {
        "analytics_run_id": run.id,
        "top_revenue_category": result["top_revenue_category"],
        "rows": [
            {
                "category": r["category"],
                "revenue": r["total_revenue"],
                "quantity": r["total_qty"],
                "revenue_share": r["revenue_share"],
                "quantity_share": r["qty_share"],
                "top_item": r["top_item"],
            }
            for r in result["rows"]
        ],
    }
