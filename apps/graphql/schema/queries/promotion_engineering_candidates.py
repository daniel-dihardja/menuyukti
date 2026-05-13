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
            "Top star and puzzle menu items derived from menu engineering. "
            "Each element in `starItems` / `puzzleItems` is an object with "
            "`menu`, `quantity` (units sold in the bucket), and `popularity` "
            "(share of bucket quantity, 0–1). "
            "When POS menu categories exist, returns `grouping=by_menu_category` with "
            "`categories.<menu_category>.starItems` and `puzzleItems`. "
            "Optional `maxStarItems` / `maxPuzzleItems` default to 5 and 10; "
            "pass 0 or a negative value for unlimited. "
            "Otherwise returns `grouping=flat` with root `starItems` and `puzzleItems`."
        )
    )
    def promotion_engineering_candidates(
        self,
        info: strawberry.Info,
        analytics_run_id: strawberry.ID,
        location_id: strawberry.ID | None = None,
        max_star_items: int | None = None,
        max_puzzle_items: int | None = None,
    ) -> JSON | None:
        user_id = user_id_from_info(info)
        with SessionLocal() as session:
            run = get_analytics_run_if_owner(session, int(analytics_run_id), user_id)
            if run is None:
                return None
            if location_id is not None and run.location_id != int(location_id):
                return None
            return build_promotion_engineering_candidates(
                session,
                run,
                max_star_items=max_star_items,
                max_puzzle_items=max_puzzle_items,
            )
