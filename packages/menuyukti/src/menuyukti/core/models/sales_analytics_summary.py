from __future__ import annotations

from pydantic import AliasChoices, BaseModel, Field


class PopularityIndexRow(BaseModel):
    menu: str
    popularity: float = Field(ge=0, le=1)
    quantity: int = Field(ge=0)


class SalesAnalyticsSummary(BaseModel):
    """
    Summary metrics produced by `calculate_sales_analytics`.

    This extends the menuyukti core input surface with order-level and
    period-level context used by downstream decision logic.
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
    popularity_index: list[PopularityIndexRow] = Field(default_factory=list)

    period_start: str
    period_end: str
