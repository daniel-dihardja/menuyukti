"""Map order metrics service payloads to Strawberry types."""

from __future__ import annotations

from graphql.schema.types.order_metrics import (
    AnalyticsRunOrderMetricsType,
    OrderMetricsByDayOfWeekType,
)


def order_metrics_to_gql(raw: dict) -> AnalyticsRunOrderMetricsType:
    by_day_of_week = [
        OrderMetricsByDayOfWeekType(
            day=r["day"],
            avgOrderSize=float(r["avg_order_size"]),
            avgOrderRevenue=float(r["avg_order_revenue"]),
        )
        for r in raw["by_day_of_week"]
    ]
    return AnalyticsRunOrderMetricsType(
        avgOrderSize=float(raw["avg_order_size"]),
        avgOrderRevenue=float(raw["avg_order_revenue"]),
        byDayOfWeek=by_day_of_week,
    )
