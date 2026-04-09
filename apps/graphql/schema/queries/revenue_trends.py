"""GraphQL types and resolver for revenueTrends."""

import strawberry

from graphql.data_sources import SessionLocal
from graphql.schema.auth import get_analytics_run_if_owner, user_id_from_info
from graphql.services.revenue_trends import build_revenue_trends


@strawberry.type(description="Per-menu revenue comparison between two analytics periods.")
class RevenueTrendRowGqlType:
    menu: str
    current_revenue: float
    previous_revenue: float
    change_pct: float | None
    rank_current: int
    rank_previous: int
    trend_label: str


@strawberry.type(description="Revenue trends for an analytics run vs a baseline period.")
class RevenueTrendsPayloadType:
    analytics_run_id: strawberry.ID
    current_period_total_revenue: float
    previous_period_total_revenue: float
    rows: list[RevenueTrendRowGqlType]


@strawberry.type
class RevenueTrendsQuery:
    @strawberry.field(
        description=(
            "Compare per-menu revenue for an analytics run against the previous run "
            "for the same location (or an explicit previousRunId). "
            "Returns null when the current run has no order lines."
        )
    )
    def revenue_trends(
        self,
        info: strawberry.Info,
        analytics_run_id: strawberry.ID,
        location_id: strawberry.ID | None = None,
        previous_run_id: strawberry.ID | None = None,
    ) -> RevenueTrendsPayloadType | None:
        user_id = user_id_from_info(info)
        session = SessionLocal()
        try:
            run = get_analytics_run_if_owner(session, int(analytics_run_id), user_id)
            if run is None:
                return None
            if location_id is not None and run.location_id != int(location_id):
                return None

            prev_id: int | None = None
            if previous_run_id is not None:
                prev_id = int(previous_run_id)
                prev_run = get_analytics_run_if_owner(session, prev_id, user_id)
                if prev_run is None or prev_run.location_id != run.location_id:
                    return None

            raw = build_revenue_trends(session, run, previous_run_id=prev_id)
            if raw is None:
                return None

            return RevenueTrendsPayloadType(
                analytics_run_id=strawberry.ID(str(raw["analytics_run_id"])),
                current_period_total_revenue=float(raw["current_period_total_revenue"]),
                previous_period_total_revenue=float(raw["previous_period_total_revenue"]),
                rows=[
                    RevenueTrendRowGqlType(
                        menu=str(r["menu"]),
                        current_revenue=float(r["current_revenue"]),
                        previous_revenue=float(r["previous_revenue"]),
                        change_pct=float(r["change_pct"])
                        if r.get("change_pct") is not None
                        else None,
                        rank_current=int(r["rank_current"]),
                        rank_previous=int(r["rank_previous"]),
                        trend_label=str(r["trend_label"]),
                    )
                    for r in raw["rows"]
                ],
            )
        finally:
            session.close()
