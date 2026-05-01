"""GraphQL query: promotion engineering candidates (matrix by menu_category or flat)."""

from __future__ import annotations

import strawberry
from strawberry.scalars import JSON

from graphql.data_sources import SessionLocal
from graphql.schema.auth import get_analytics_run_if_owner, user_id_from_info
from graphql.services.promotion_engineering_candidates import (
    build_promotion_engineering_candidates,
)


@strawberry.type
class PromotionEngineeringCandidatesQuery:
    @strawberry.field(
        description=(
            "Menu engineering matrix and top star/puzzle items per distinct "
            "`order_fact.menu_category` when present; otherwise a single flat matrix on all rows. "
            "Returns JSON: `grouping` (`by_menu_category` | `flat`), optional `categories` map, "
            "`rowsSkippedMissingCategory`, and matrix slices. When locationId is set, the run "
            "must belong to that location (otherwise returns null)."
        )
    )
    def promotion_engineering_candidates(
        self,
        info: strawberry.Info,
        analytics_run_id: strawberry.ID,
        location_id: strawberry.ID | None = None,
    ) -> JSON | None:
        user_id = user_id_from_info(info)
        with SessionLocal() as session:
            run = get_analytics_run_if_owner(session, int(analytics_run_id), user_id)
            if run is None:
                return None
            if location_id is not None and run.location_id != int(location_id):
                return None
            return build_promotion_engineering_candidates(session, run)
