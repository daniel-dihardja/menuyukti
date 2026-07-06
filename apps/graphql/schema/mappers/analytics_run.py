"""Map order metrics service payloads to Strawberry types."""

from __future__ import annotations

from graphql.schema.queries.menu_combos import slot_demand_cells_to_gql
from graphql.schema.types.order_metrics import AnalyticsRunOrderMetricsType


def order_metrics_to_gql(raw: dict) -> AnalyticsRunOrderMetricsType:
    return AnalyticsRunOrderMetricsType(
        avgOrderSize=float(raw["avg_order_size"]),
        avgOrderRevenue=float(raw["avg_order_revenue"]),
        slot_demand_profile=slot_demand_cells_to_gql(raw.get("slot_demand_profile", [])),
    )
