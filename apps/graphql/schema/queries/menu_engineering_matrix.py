"""GraphQL types and resolver for menuEngineeringMatrix."""

import strawberry

from graphql.context import request_session_scope
from graphql.schema.auth import get_analytics_run_if_owner, user_id_from_info
from graphql.schema.mappers.menu_engineering_matrix import matrix_data_to_gql

# Re-export types for backward-compatible imports from this query module.
from graphql.schema.types.menu_engineering_matrix import (  # noqa: F401
    MenuEngineeringDistributionItemType,
    MenuEngineeringMatrixItemType,
    MenuEngineeringMatrixType,
    MenuEngineeringThresholdsType,
)
from graphql.services.menu_engineering import compute_menu_engineering_matrix


@strawberry.type
class MenuEngineeringMatrixQuery:
    @strawberry.field(
        description=(
            "Compute the menu engineering BCG matrix for an analytics run. "
            "Requires COGS to be set; returns None if no COGS are available. "
            "Optionally filter returned items to specific categories "
            "(star, puzzle, plow_horse, low_end) — thresholds and distribution "
            "always reflect the full dataset. "
            "When locationId is set, the run must belong to that location (otherwise returns null)."
        )
    )
    def menu_engineering_matrix(
        self,
        info: strawberry.Info,
        analytics_run_id: strawberry.ID,
        categories: list[str] | None = None,
        location_id: strawberry.ID | None = None,
    ) -> MenuEngineeringMatrixType | None:
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
            matrix_data = compute_menu_engineering_matrix(session, run, info=info)
            if matrix_data is None:
                return None
            matrix = matrix_data_to_gql(matrix_data)
            if not categories:
                return matrix
            category_set = set(categories)
            filtered_items = [i for i in matrix.items if i.category in category_set]
            return MenuEngineeringMatrixType(
                thresholds=matrix.thresholds,
                distribution=matrix.distribution,
                items=filtered_items,
            )
