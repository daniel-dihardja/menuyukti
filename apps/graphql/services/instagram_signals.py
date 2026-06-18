"""Compose Instagram signals from OrderFact rows and menuyukti pipelines."""

from __future__ import annotations

from typing import Any

import strawberry
from menuyukti.core.analytics import (
    OperatingProfileResult,
    calculate_instagram_signals,
    compute_category_mix_from_orders,
    compute_operating_profile_from_orders,
    compute_revenue_trends_from_orders,
    compute_sales_analytics_from_orders,
)
from sqlalchemy.orm import Session

from graphql.data_sources import AnalyticsRun
from graphql.services.analytics_runs import get_previous_analytics_run
from graphql.services.menu_engineering import compute_menu_engineering_matrix
from graphql.services.order_fact_rows import (
    facts_to_category_mix_rows,
    facts_to_operating_profile_rows,
    facts_to_revenue_trend_rows,
    facts_to_sales_analytics_rows,
)
from graphql.services.order_facts import load_order_facts


def build_instagram_signals(
    session: Session,
    run: AnalyticsRun,
    *,
    info: strawberry.Info | None = None,
) -> dict[str, Any] | None:
    """
    Load order facts for ``run`` and the prior run (if any), run analytics pipelines,
    and return a JSON-friendly dict matching :class:`InstagramSignalsResult`.
    """
    facts = load_order_facts(session, run.id, info=info)
    if not facts:
        return None

    prev_run = get_previous_analytics_run(session, run.location_id, run.id)
    prev_facts = load_order_facts(session, prev_run.id, info=info) if prev_run is not None else []

    sales_rows = facts_to_sales_analytics_rows(facts)
    sales_analytics = compute_sales_analytics_from_orders(sales_rows)

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

    matrix_data = compute_menu_engineering_matrix(session, run, order_facts=facts, info=info)
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
