"""Weekly demand pattern from order facts for the latest analytics run."""

from __future__ import annotations

from typing import Any

import strawberry
from menuyukti.core.analytics import (
    OrderRowForWeeklyDemand,
    compute_weekly_demand_pattern_from_orders,
)
from sqlalchemy.orm import Session

from graphql.data_sources import AnalyticsRun
from graphql.services.order_facts import load_order_facts


def build_weekly_demand_pattern(
    session: Session,
    run: AnalyticsRun,
    *,
    info: strawberry.Info | None = None,
) -> list[dict[str, Any]]:
    """Return camelCase dict rows for GraphQL (isoWeek, weekLabel, ...)."""
    facts = load_order_facts(session, run.id, info=info)
    if not facts:
        return []

    rows: list[OrderRowForWeeklyDemand] = [
        OrderRowForWeeklyDemand(
            bill_number=str(r.bill_number),
            order_time=r.order_time,
            total_after_bill_discount=float(r.total_after_bill_discount),
        )
        for r in facts
    ]
    typed = compute_weekly_demand_pattern_from_orders(rows)
    return [
        {
            "iso_week": r["iso_week"],
            "week_label": r["week_label"],
            "revenue_index": r["revenue_index"],
            "tx_index": r["tx_index"],
            "relative_demand": r["relative_demand"],
        }
        for r in typed
    ]
