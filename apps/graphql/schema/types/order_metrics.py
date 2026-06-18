"""Order metrics GraphQL types."""

import strawberry


@strawberry.type(description="Average order size and revenue for a single weekday.")
class OrderMetricsByDayOfWeekType:
    day: str
    avgOrderSize: float
    avgOrderRevenue: float


@strawberry.type(description="Average order size and revenue for an analytics run.")
class AnalyticsRunOrderMetricsType:
    avgOrderSize: float
    avgOrderRevenue: float
    byDayOfWeek: list[OrderMetricsByDayOfWeekType]
