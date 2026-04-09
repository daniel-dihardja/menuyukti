"""GraphQL types and resolver for categoryMix."""

import strawberry

from graphql.data_sources import SessionLocal
from graphql.schema.auth import get_analytics_run_if_owner, user_id_from_info
from graphql.services.category_mix import build_category_mix


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


@strawberry.type
class CategoryMixQuery:
    @strawberry.field(
        description=(
            "Revenue and quantity share per menu category for an analytics run. "
            "Returns null when the run has no order lines."
        )
    )
    def category_mix(
        self,
        info: strawberry.Info,
        analytics_run_id: strawberry.ID,
        location_id: strawberry.ID | None = None,
    ) -> CategoryMixPayloadType | None:
        user_id = user_id_from_info(info)
        with SessionLocal() as session:
            run = get_analytics_run_if_owner(session, int(analytics_run_id), user_id)
            if run is None:
                return None
            if location_id is not None and run.location_id != int(location_id):
                return None

            raw = build_category_mix(session, run)
            if raw is None:
                return None

            return CategoryMixPayloadType(
                analytics_run_id=strawberry.ID(str(raw["analytics_run_id"])),
                top_revenue_category=raw.get("top_revenue_category"),
                rows=[
                    CategoryMixRowGqlType(
                        category=r.get("category"),
                        revenue=float(r["revenue"]),
                        quantity=int(r["quantity"]),
                        revenue_share=float(r["revenue_share"]),
                        quantity_share=float(r["quantity_share"]),
                        top_item=str(r["top_item"]),
                    )
                    for r in raw["rows"]
                ],
            )
