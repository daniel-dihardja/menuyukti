"""Category mix payload for GraphQL."""

from __future__ import annotations

from typing import Any

from menuyukti.core.analytics import compute_category_mix_from_orders
from sqlalchemy.orm import Session

from graphql.data_sources import AnalyticsRun, OrderFact
from graphql.services.order_fact_rows import facts_to_category_mix_rows


def build_category_mix(session: Session, run: AnalyticsRun) -> dict[str, Any] | None:
    """Return category mix rows and top category, or None if no order data."""
    facts = session.query(OrderFact).where(OrderFact.analytics_run_id == run.id).all()
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
