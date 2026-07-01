"""Latest analytics run plus Instagram signals in one query (agents campaign brief)."""

from __future__ import annotations

import strawberry
from menuyukti.core.analytics import compute_slot_demand_profile_from_orders

from graphql.context import request_session_scope
from graphql.data_sources import AnalyticsRun
from graphql.schema.auth import is_location_owner, user_id_from_info
from graphql.schema.mappers.instagram_signals import instagram_signals_raw_to_gql
from graphql.schema.queries.menu_combos import SlotDemandCellType, slot_demand_cells_to_gql
from graphql.schema.types.instagram_signals import InstagramSignalsType
from graphql.services.instagram_signals import build_instagram_signals
from graphql.services.order_fact_rows import facts_to_combo_timing_rows
from graphql.services.order_facts import load_order_facts


@strawberry.type(description="Latest analytics run metadata for a location.")
class LatestAnalyticsRunType:
    id: strawberry.ID
    name: str


@strawberry.type(description="Latest run for a location with composite Instagram signals.")
class LatestAnalyticsRunWithSignalsType:
    analytics_run: LatestAnalyticsRunType | None
    instagram_signals: InstagramSignalsType | None
    slot_demand_profile: list[SlotDemandCellType]


@strawberry.type
class LatestAnalyticsRunWithSignalsQuery:
    @strawberry.field(
        description=(
            "Resolve the newest analytics run for a location and return instagramSignals "
            "in one request (single OrderFact load path when signals are requested)."
        )
    )
    def latest_analytics_run_with_signals(
        self,
        info: strawberry.Info,
        location_id: int,
    ) -> LatestAnalyticsRunWithSignalsType | None:
        user_id = user_id_from_info(info)
        with request_session_scope(info) as session:
            if not is_location_owner(session, location_id, user_id, info=info):
                return None
            run = (
                session.query(AnalyticsRun)
                .where(AnalyticsRun.location_id == location_id)
                .order_by(AnalyticsRun.id.desc())
                .first()
            )
            if run is None:
                return LatestAnalyticsRunWithSignalsType(
                    analytics_run=None,
                    instagram_signals=None,
                    slot_demand_profile=[],
                )

            facts = load_order_facts(session, run.id, info=info)
            raw = build_instagram_signals(session, run, info=info, order_facts=facts)
            signals = instagram_signals_raw_to_gql(run.id, raw) if raw is not None else None
            slot_profile_raw = (
                compute_slot_demand_profile_from_orders(facts_to_combo_timing_rows(facts))
                if facts
                else []
            )
            slot_demand_profile = slot_demand_cells_to_gql(slot_profile_raw)

            return LatestAnalyticsRunWithSignalsType(
                analytics_run=LatestAnalyticsRunType(id=strawberry.ID(str(run.id)), name=run.name),
                instagram_signals=signals,
                slot_demand_profile=slot_demand_profile,
            )
