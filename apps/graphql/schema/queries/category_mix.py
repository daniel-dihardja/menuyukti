"""GraphQL types and resolver for categoryMix."""

import strawberry

from graphql.context import request_session_scope
from graphql.schema.auth import get_analytics_run_if_owner, user_id_from_info
from graphql.schema.mappers.category_mix import category_mix_to_gql
from graphql.schema.types.category_mix import CategoryMixPayloadType, CategoryMixRowGqlType
from graphql.services.category_mix import build_category_mix

# Re-export types for backward-compatible imports from this query module.
__all__ = ["CategoryMixPayloadType", "CategoryMixQuery", "CategoryMixRowGqlType"]


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
        with request_session_scope(info) as session:
            run = get_analytics_run_if_owner(
                session,
                int(analytics_run_id),
                user_id,
                info=info,
                location_id=int(location_id) if location_id is not None else None,
            )
            if run is None:
                return None

            raw = build_category_mix(session, run, info=info)
            if raw is None:
                return None

            return category_mix_to_gql(raw)
