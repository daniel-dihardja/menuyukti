from __future__ import annotations

from datetime import date
from typing import Any

from marketing_engine.core.contracts.v1 import (
    MatrixDistributionV1,
    MatrixItemV1,
    MenuHeatmapV1,
    SalesAnalyticsSummaryV1,
)
from marketing_engine.core.models.heatmap import HourlyDemand, MenuHeatmap, WeeklyDemand
from marketing_engine.core.models.matrix_distribution import (
    CategoryDistribution,
    MatrixDistribution,
)
from marketing_engine.core.models.matrix_item import MatrixItem
from marketing_engine.core.models.sales_analytics_summary import SalesAnalyticsSummary


def _format_reporting_period(period_start: date | None) -> str:
    if not period_start:
        return "unknown"
    return period_start.strftime("%Y-%m")


def to_core_matrix_item(payload: dict[str, Any]) -> MatrixItem:
    canonical = MatrixItemV1(**payload)
    return MatrixItem(**canonical.model_dump())


def to_core_heatmap(
    payload: dict[str, Any],
    period_start: date | None = None,
) -> MenuHeatmap:
    canonical = MenuHeatmapV1(**payload)
    reporting_period = canonical.reporting_period or _format_reporting_period(period_start)
    return MenuHeatmap(
        menu=canonical.menu,
        menu_category=canonical.menu_category,
        menu_category_detail=canonical.menu_category_detail,
        daily_heatmap=[
            HourlyDemand(hour=row.hour, quantity=row.quantity)
            for row in canonical.daily_heatmap
        ],
        weekly_heatmap=[
            WeeklyDemand(day=row.day, quantity=row.quantity)
            for row in canonical.weekly_heatmap
        ],
        reporting_period=reporting_period,
    )


def to_core_distribution(payload: dict[str, Any]) -> MatrixDistribution:
    canonical = MatrixDistributionV1(**payload)
    return MatrixDistribution(
        categories=[
            CategoryDistribution(
                category=row.category,
                item_count=row.item_count,
                item_share=row.item_share,
                margin_share=row.margin_share,
            )
            for row in canonical.categories
        ]
    )


def to_core_sales_summary(payload: dict[str, Any]) -> SalesAnalyticsSummary:
    canonical = SalesAnalyticsSummaryV1(**payload)
    return SalesAnalyticsSummary(
        total_orders=canonical.total_orders,
        total_items_sold=canonical.total_items_sold,
        total_revenue=canonical.total_revenue,
        avg_order_revenue=canonical.avg_order_revenue,
        max_order_revenue=canonical.max_order_revenue,
        min_order_revenue=canonical.min_order_revenue,
        avg_order_items=canonical.avg_order_items,
        max_order_items=canonical.max_order_items,
        min_order_items=canonical.min_order_items,
        avg_popularity_threshold=canonical.avg_popularity_threshold,
        popularity_index=canonical.popularity_index,
        period_start=canonical.period_start.isoformat(),
        period_end=canonical.period_end.isoformat(),
    )
