"""GraphQL types and resolver for slotMenuCandidates."""

from __future__ import annotations

import strawberry

from graphql.context import request_session_scope
from graphql.schema.auth import get_analytics_run_if_owner, user_id_from_info
from graphql.schema.mappers.slot_menu_candidates import slot_menu_candidates_data_to_gql
from graphql.schema.types.slot_menu_candidates import SlotMenuCandidatesType
from graphql.services.compute_limits import compute_timeout
from graphql.services.slot_menu_candidates import build_slot_menu_candidates


@strawberry.input(
    description="Options for per-slot menu promotion candidate ranking and filtering."
)
class SlotMenuCandidatesOptionsInput:
    max_candidates_per_slot: int | None = None
    min_venue_orders_in_slot: int | None = None
    min_item_qty_in_slot: int | None = None
    include_low_end: bool | None = None
    slots_filter: str | None = None


@strawberry.type
class SlotMenuCandidatesQuery:
    @strawberry.field(
        description=(
            "Rank menu promotion candidates per venue slot (day × meal_period). "
            "Combines slot demand profile, per-slot order-line sales, and global menu "
            "engineering classification. Returns null when the run has no order facts. "
            "When COGS are missing, matrixAvailable is false and candidates are ranked "
            "by slot sales only. "
            "When locationId is set, the run must belong to that location (otherwise returns null)."
        )
    )
    def slot_menu_candidates(
        self,
        info: strawberry.Info,
        analytics_run_id: strawberry.ID,
        location_id: strawberry.ID | None = None,
        options: SlotMenuCandidatesOptionsInput | None = None,
    ) -> SlotMenuCandidatesType | None:
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

            opts_dict: dict[str, object] | None = None
            if options is not None:
                opts_dict = {
                    key: value
                    for key, value in {
                        "max_candidates_per_slot": options.max_candidates_per_slot,
                        "min_venue_orders_in_slot": options.min_venue_orders_in_slot,
                        "min_item_qty_in_slot": options.min_item_qty_in_slot,
                        "include_low_end": options.include_low_end,
                        "slots_filter": options.slots_filter,
                    }.items()
                    if value is not None
                }

            with compute_timeout():
                data = build_slot_menu_candidates(
                    session,
                    run,
                    options=opts_dict,
                    info=info,
                )
            if data is None:
                return None

            return slot_menu_candidates_data_to_gql(data)
