"""GraphQL query: simplified promotion candidates for post scheduler."""

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
            "Top star and puzzle menu-item names derived from menu engineering. "
            "When POS menu categories exist, returns `grouping=by_menu_category` with "
            "`categories.<menu_category>.starItems` (up to 5) and `puzzleItems` (up to 10). "
            "Otherwise returns `grouping=flat` with root `starItems` and `puzzleItems`."
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
