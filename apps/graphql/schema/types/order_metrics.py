"""Order metrics GraphQL types."""

import strawberry

from graphql.schema.queries.menu_combos import SlotDemandCellType


@strawberry.type(description="Average order size and revenue for an analytics run.")
class AnalyticsRunOrderMetricsType:
    avgOrderSize: float
    avgOrderRevenue: float
    slot_demand_profile: list[SlotDemandCellType]
