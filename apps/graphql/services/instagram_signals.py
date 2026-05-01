"""Compose Instagram signals from OrderFact rows and menuyukti pipelines."""

from __future__ import annotations

from typing import Any

from menuyukti.core.analytics import (
    calculate_instagram_signals,
    compute_category_mix_from_orders,
    compute_revenue_trends_from_orders,
    compute_sales_analytics_from_orders,
)
from menuyukti.core.analytics.calculate_operating_profile import (
    OperatingProfileResult,
    compute_operating_profile_from_orders,
)
from sqlalchemy.orm import Session

from graphql.data_sources import AnalyticsRun, OrderFact
from graphql.services.analytics_runs import get_previous_analytics_run
from graphql.services.menu_engineering import compute_menu_engineering_matrix
from graphql.services.order_fact_rows import (
    facts_to_category_mix_rows,
    facts_to_operating_profile_rows,
    facts_to_revenue_trend_rows,
    facts_to_sales_analytics_rows,
)


def build_instagram_signals(session: Session, run: AnalyticsRun) -> dict[str, Any] | None:
    """
    Load order facts for ``run`` and the prior run (if any), run analytics pipelines,
    and return a JSON-friendly dict matching :class:`InstagramSignalsResult`.
    """
    facts = session.query(OrderFact).where(OrderFact.analytics_run_id == run.id).all()
    if not facts:
        return None

    prev_run = get_previous_analytics_run(session, run.location_id, run.id)
    prev_facts: list[OrderFact] = []
    if prev_run is not None:
        prev_facts = session.query(OrderFact).where(OrderFact.analytics_run_id == prev_run.id).all()

    sales_rows = facts_to_sales_analytics_rows(facts)
    pos_system = (run.pos_system or "").strip().lower()
    # Quino exports omit bill linkage and real timestamps; treat as explicitly minimal.
    # For other POS systems, derive order_id / datetime tiers from actual OrderFact rows so
    # reports without usable order_time do not advertise heatmaps or posting windows.
    is_quino = pos_system == "quino"
    sales_analytics = compute_sales_analytics_from_orders(
        sales_rows,
        has_order_id=False if is_quino else None,
        has_datetime=False if is_quino else None,
    )

    cat_rows = facts_to_category_mix_rows(facts)
    category_mix = compute_category_mix_from_orders(cat_rows)

    curr_rev = facts_to_revenue_trend_rows(facts)
    prev_rev = facts_to_revenue_trend_rows(prev_facts)
    revenue_trends = compute_revenue_trends_from_orders(curr_rev, prev_rev)

    op_rows = facts_to_operating_profile_rows(facts)
    has_datetime_effective = bool(sales_analytics["capabilities"]["has_datetime"])
    operating_profile: OperatingProfileResult | None = (
        compute_operating_profile_from_orders(op_rows) if has_datetime_effective else None
    )

    matrix_data = compute_menu_engineering_matrix(session, run, order_facts=facts)
    menu_engineering = (
        {
            "thresholds": matrix_data.thresholds,
            "distribution": matrix_data.distribution,
            "items": matrix_data.items,
        }
        if matrix_data is not None
        else None
    )

    return calculate_instagram_signals(
        category_mix=category_mix,
        revenue_trends=revenue_trends,
        sales_analytics=sales_analytics,
        operating_profile=operating_profile,
        menu_engineering=menu_engineering,
    )
