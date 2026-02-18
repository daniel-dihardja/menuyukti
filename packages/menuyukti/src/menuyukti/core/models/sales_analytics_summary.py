from __future__ import annotations

from typing import Any

from pydantic import AliasChoices, BaseModel, Field


class SalesAnalyticsSummary(BaseModel):
    """
    Summary metrics produced by `calculate_sales_analytics`.

    This extends the marketing engine core input surface with order-level and
    period-level context that audience agents can use directly.
    """

    total_orders: int
    total_items_sold: int
    total_revenue: float

    avg_order_revenue: float
    max_order_revenue: float
    min_order_revenue: float

    avg_order_items: float
    max_order_items: int
    min_order_items: int

    avg_popularity_threshold: float = Field(
        validation_alias=AliasChoices("avg_popularity_threshold", "avg_popularity"),
        serialization_alias="avg_popularity_threshold",
    )
    popularity_index: list[dict[str, Any]] = Field(default_factory=list)

    period_start: str
    period_end: str
