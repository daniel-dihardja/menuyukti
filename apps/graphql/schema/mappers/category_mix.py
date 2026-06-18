"""Map category mix service payloads to Strawberry types."""

from __future__ import annotations

import strawberry
from graphql.schema.types.category_mix import CategoryMixPayloadType, CategoryMixRowGqlType


def category_mix_to_gql(raw: dict) -> CategoryMixPayloadType:
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
