"""Week-level demand indices for campaign calendar planning."""

from __future__ import annotations

import strawberry

from graphql.context import request_session_scope
from graphql.data_sources import AnalyticsRun
from graphql.schema.auth import is_location_owner, user_id_from_info
from graphql.services.weekly_demand_pattern import build_weekly_demand_pattern


@strawberry.type
class WeeklyDemandPatternRowType:
    isoWeek: str
    weekLabel: str
    revenueIndex: float
    txIndex: float
    relativeDemand: str


@strawberry.type
class WeeklyDemandPatternPayloadType:
    analyticsRunId: strawberry.ID
    rows: list[WeeklyDemandPatternRowType]


@strawberry.type
class WeeklyDemandPatternQuery:
    @strawberry.field(
        description=(
            "Bill-level revenue and transaction counts rolled up by ISO week for the latest "
            "analytics run. Indices are normalized to mean 1.0 within the series."
        )
    )
    def weekly_demand_pattern(
        self,
        info: strawberry.Info,
        location_id: int,
    ) -> WeeklyDemandPatternPayloadType | None:
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
                return None
            raw_rows = build_weekly_demand_pattern(session, run, info=info)
            if not raw_rows:
                return None
            rows = [
                WeeklyDemandPatternRowType(
                    isoWeek=str(r["iso_week"]),
                    weekLabel=str(r["week_label"]),
                    revenueIndex=float(r["revenue_index"]),
                    txIndex=float(r["tx_index"]),
                    relativeDemand=str(r["relative_demand"]),
                )
                for r in raw_rows
            ]
            return WeeklyDemandPatternPayloadType(
                analyticsRunId=strawberry.ID(str(run.id)),
                rows=rows,
            )
