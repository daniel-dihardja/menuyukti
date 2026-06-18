"""Composite analytics bundle orchestration."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import strawberry
from sqlalchemy.orm import Session

from graphql.data_sources import AnalyticsRun
from graphql.services.category_mix import build_category_mix
from graphql.services.menu_engineering import compute_menu_engineering_matrix
from graphql.services.menu_heatmaps import build_menu_heatmaps
from graphql.services.order_facts import load_order_facts
from graphql.services.order_metrics import build_order_metrics


@dataclass
class AnalyticsBundleOptions:
    include_order_metrics: bool = True
    include_menu_engineering_matrix: bool = True
    include_menu_heatmaps: bool = True
    include_category_mix: bool = True


@dataclass
class AnalyticsBundleData:
    analytics_run_id: int
    order_metrics: dict[str, Any] | None = None
    menu_engineering_matrix: Any | None = None
    menu_heatmaps: list[dict[str, Any]] | None = None
    category_mix: dict[str, Any] | None = None


def build_analytics_bundle(
    session: Session,
    run: AnalyticsRun,
    options: AnalyticsBundleOptions,
    *,
    info: strawberry.Info | None = None,
) -> AnalyticsBundleData:
    """Load order facts once and compute selected analytics sections."""
    facts = load_order_facts(session, run.id, info=info)

    order_metrics: dict[str, Any] | None = None
    matrix_data = None
    heatmaps: list[dict[str, Any]] | None = None
    category_mix: dict[str, Any] | None = None

    if options.include_order_metrics:
        order_metrics = build_order_metrics(session, run, info=info, order_facts=facts)
    if options.include_menu_engineering_matrix:
        matrix_data = compute_menu_engineering_matrix(session, run, order_facts=facts, info=info)
    if options.include_menu_heatmaps:
        heatmaps = build_menu_heatmaps(session, run, info=info, order_facts=facts)
    if options.include_category_mix:
        category_mix = build_category_mix(session, run, info=info, order_facts=facts)

    return AnalyticsBundleData(
        analytics_run_id=run.id,
        order_metrics=order_metrics,
        menu_engineering_matrix=matrix_data,
        menu_heatmaps=heatmaps,
        category_mix=category_mix,
    )
