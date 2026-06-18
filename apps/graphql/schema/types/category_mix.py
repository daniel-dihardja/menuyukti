"""Category mix GraphQL types."""

import strawberry


@strawberry.type(description="Revenue and quantity mix for one menu category.")
class CategoryMixRowGqlType:
    category: str | None
    revenue: float
    quantity: int
    revenue_share: float
    quantity_share: float
    top_item: str


@strawberry.type(description="Category mix table for an analytics run.")
class CategoryMixPayloadType:
    analytics_run_id: strawberry.ID
    top_revenue_category: str | None
    rows: list[CategoryMixRowGqlType]
