"""GraphQL composite read model for the IG Plan milestone."""

from __future__ import annotations

import strawberry

from graphql.context import request_session_scope
from graphql.schema.auth import get_analytics_run_if_owner, is_location_owner, user_id_from_info
from graphql.schema.mappers.menu_engineering_matrix import matrix_data_to_gql
from graphql.schema.mappers.slot_menu_candidates import slot_menu_candidates_data_to_gql
from graphql.schema.queries.latest_analytics_run_signals import LatestAnalyticsRunType
from graphql.schema.queries.menu_combos import SlotDemandCellType, slot_demand_cells_to_gql
from graphql.schema.types.location import OpeningHourType
from graphql.schema.types.location_manual_brief_input import LocationManualBriefInputType
from graphql.schema.types.menu_engineering_matrix import MenuEngineeringMatrixType
from graphql.schema.types.slot_menu_candidates import SlotMenuCandidatesType
from graphql.services.compute_limits import compute_timeout
from graphql.services.ig_plan_inputs import (
    IG_PLAN_INPUTS_VERSION,
    IgPlanInputsOptions,
    build_ig_plan_inputs,
)


@strawberry.type(description="Location identity and owner quick profile for IG Plan.")
class IgPlanLocationSnapshotType:
    id: strawberry.ID
    name: str
    street: str | None
    city: str | None
    country: str | None
    currency: str | None
    manual_brief_input: LocationManualBriefInputType | None
    opening_hours: list[OpeningHourType]


@strawberry.input(description="Options for the IG Plan composite inputs query.")
class IgPlanInputsOptionsInput:
    matrix_categories: list[str] | None = None
    max_candidates_per_slot: int | None = None
    include_low_end: bool | None = None


@strawberry.type(
    description=(
        "Composite IG Plan inputs for a location: owner location profile plus latest-run "
        "slot demand, menu engineering matrix, and slot menu candidates from one OrderFact load."
    )
)
class IgPlanInputsType:
    version: int
    location: IgPlanLocationSnapshotType
    analytics_run: LatestAnalyticsRunType | None
    slot_demand_profile: list[SlotDemandCellType]
    menu_engineering_matrix: MenuEngineeringMatrixType | None
    slot_menu_candidates: SlotMenuCandidatesType | None
    coverage_notes: list[str]


def _options_from_input(options: IgPlanInputsOptionsInput | None) -> IgPlanInputsOptions:
    if options is None:
        return IgPlanInputsOptions()
    kwargs: dict[str, object] = {}
    if options.matrix_categories is not None:
        kwargs["matrix_categories"] = list(options.matrix_categories)
    if options.max_candidates_per_slot is not None:
        kwargs["max_candidates_per_slot"] = int(options.max_candidates_per_slot)
    if options.include_low_end is not None:
        kwargs["include_low_end"] = bool(options.include_low_end)
    return IgPlanInputsOptions(**kwargs)  # type: ignore[arg-type]


@strawberry.type
class IgPlanInputsQuery:
    @strawberry.field(
        description=(
            "Return location profile and latest analytics-run inputs for IG Plan in one request. "
            "Uses a single OrderFact load for slot demand, menu engineering matrix, and slot "
            "menu candidates. Returns null when the caller cannot access the location."
        )
    )
    def ig_plan_inputs(
        self,
        info: strawberry.Info,
        location_id: int,
        analytics_run_id: strawberry.ID | None = None,
        options: IgPlanInputsOptionsInput | None = None,
    ) -> IgPlanInputsType | None:
        user_id = user_id_from_info(info)
        with request_session_scope(info) as session:
            if not is_location_owner(session, location_id, user_id, info=info):
                return None

            pinned_run_id: int | None = None
            if analytics_run_id is not None:
                raw_run_id = str(analytics_run_id).strip()
                if not raw_run_id.isdigit():
                    return None
                pinned = get_analytics_run_if_owner(session, int(raw_run_id), user_id, info=info)
                if pinned is None or pinned.location_id != location_id:
                    return None
                pinned_run_id = pinned.id

            with compute_timeout():
                data = build_ig_plan_inputs(
                    session,
                    location_id,
                    _options_from_input(options),
                    analytics_run_id=pinned_run_id,
                    info=info,
                )
            if data is None:
                return None

            manual = LocationManualBriefInputType(
                location_id=data.location.manual_brief_location_id,
                quick_profile=data.location.quick_profile,
            )
            location_type = IgPlanLocationSnapshotType(
                id=strawberry.ID(str(data.location.id)),
                name=data.location.name,
                street=data.location.street,
                city=data.location.city,
                country=data.location.country,
                currency=data.location.currency,
                manual_brief_input=manual,
                opening_hours=[
                    OpeningHourType(
                        day_of_week=hour.day_of_week,
                        open_time=hour.open_time,
                        close_time=hour.close_time,
                    )
                    for hour in data.location.opening_hours
                ],
            )
            analytics_run = (
                LatestAnalyticsRunType(
                    id=strawberry.ID(str(data.analytics_run.id)),
                    name=data.analytics_run.name,
                )
                if data.analytics_run is not None
                else None
            )
            return IgPlanInputsType(
                version=IG_PLAN_INPUTS_VERSION,
                location=location_type,
                analytics_run=analytics_run,
                slot_demand_profile=slot_demand_cells_to_gql(data.slot_demand_profile),
                menu_engineering_matrix=(
                    matrix_data_to_gql(data.menu_engineering_matrix)
                    if data.menu_engineering_matrix is not None
                    else None
                ),
                slot_menu_candidates=(
                    slot_menu_candidates_data_to_gql(data.slot_menu_candidates)
                    if data.slot_menu_candidates is not None
                    else None
                ),
                coverage_notes=list(data.coverage_notes),
            )
