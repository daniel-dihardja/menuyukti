"""Revenue trends payload for GraphQL."""

from __future__ import annotations

from typing import Any

from menuyukti.core.analytics import compute_revenue_trends_from_orders
from sqlalchemy.orm import Session

from graphql.data_sources import AnalyticsRun, OrderFact
from graphql.services.analytics_runs import get_previous_analytics_run
from graphql.services.order_fact_rows import facts_to_revenue_trend_rows


def build_revenue_trends(
    session: Session,
    run: AnalyticsRun,
    *,
    previous_run_id: int | None = None,
) -> dict[str, Any] | None:
    """
    Compare per-menu revenue for ``run`` vs the previous period.

    When ``previous_run_id`` is set, that run is used as the baseline (must belong
    to the same location). Otherwise the next-older run for the location is used.
    """
    facts = session.query(OrderFact).where(OrderFact.analytics_run_id == run.id).all()
    if not facts:
        return None

    if previous_run_id is not None:
        prev_row = (
            session.query(AnalyticsRun).where(AnalyticsRun.id == previous_run_id).one_or_none()
        )
        if prev_row is None or prev_row.location_id != run.location_id:
            prev_facts: list[OrderFact] = []
        else:
            prev_facts = (
                session.query(OrderFact).where(OrderFact.analytics_run_id == previous_run_id).all()
            )
    else:
        prev_run = get_previous_analytics_run(session, run.location_id, run.id)
        prev_facts = (
            session.query(OrderFact).where(OrderFact.analytics_run_id == prev_run.id).all()
            if prev_run is not None
            else []
        )

    curr_rows = facts_to_revenue_trend_rows(facts)
    prev_rows = facts_to_revenue_trend_rows(prev_facts)
    result = compute_revenue_trends_from_orders(curr_rows, prev_rows)

    return {
        "analytics_run_id": run.id,
        "current_period_total_revenue": result["current_period_total_revenue"],
        "previous_period_total_revenue": result["previous_period_total_revenue"],
        "rows": [
            {
                "menu": r["menu"],
                "current_revenue": r["current_revenue"],
                "previous_revenue": r["previous_revenue"],
                "change_pct": r["pct_change"],
                "rank_current": r["current_rank"],
                "rank_previous": r["previous_rank"],
                "trend_label": r["trend_label"],
            }
            for r in result["rows"]
        ],
    }
