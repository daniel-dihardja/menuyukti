import strawberry
from sqlalchemy import func, or_
from sqlalchemy.orm import selectinload

from graphql.context import request_session_scope
from graphql.data_sources import AnalyticsRun, Location, WorkspaceMembership
from graphql.limits import DEFAULT_LIST_FIRST, MAX_LIST_FIRST, clamp_page_size
from graphql.schema.auth import is_location_owner, user_id_from_info
from graphql.schema.types import LocationType, OpeningHourType


def _location_to_gql(row: Location) -> LocationType:
    opening_hours = [
        OpeningHourType(
            day_of_week=hour.day_of_week,
            open_time=hour.open_time.strftime("%H:%M"),
            close_time=hour.close_time.strftime("%H:%M"),
        )
        for hour in row.opening_hours
    ]
    return LocationType(
        id=row.id,
        name=row.name,
        street=row.street,
        city=row.city,
        country=row.country,
        currency=row.currency,
        node_id=str(row.node_id) if row.node_id is not None else None,
        workspace_id=str(row.workspace_id) if row.workspace_id is not None else None,
        opening_hours=opening_hours,
    )


@strawberry.type(description="Summary of analytics runs for one location.")
class LocationAnalyticsRunSummaryType:
    id: strawberry.ID
    name: str


@strawberry.type(description="Run count and latest run for a location.")
class LocationAnalyticsSummaryType:
    location_id: int
    run_count: int
    latest_run: LocationAnalyticsRunSummaryType | None


@strawberry.type
class LocationsQuery:
    @strawberry.field(
        description="All locations the current user can access (direct owner or workspace member)."
    )
    def locations(self, info: strawberry.Info, first: int | None = None) -> list[LocationType]:
        user_id = user_id_from_info(info)
        if not user_id:
            return []
        limit = clamp_page_size(
            first,
            default=DEFAULT_LIST_FIRST,
            maximum=MAX_LIST_FIRST,
        )
        with request_session_scope(info) as session:
            workspace_ids = [
                w[0]
                for w in session.query(WorkspaceMembership.workspace_id)
                .filter(WorkspaceMembership.clerk_user_id == user_id)
                .all()
            ]
            access = [Location.clerk_user_id == user_id]
            if workspace_ids:
                access.append(Location.workspace_id.in_(workspace_ids))
            rows = (
                session.query(Location)
                .options(selectinload(Location.opening_hours))
                .filter(or_(*access))
                .order_by(Location.id.desc())
                .limit(limit)
                .all()
            )
            return [_location_to_gql(row) for row in rows]

    @strawberry.field(
        description=(
            "Analytics run counts and latest run per location in one query. "
            "Only returns summaries for locations the caller can access."
        )
    )
    def location_analytics_summaries(
        self,
        info: strawberry.Info,
        location_ids: list[int],
    ) -> list[LocationAnalyticsSummaryType]:
        user_id = user_id_from_info(info)
        if not user_id or not location_ids:
            return []
        unique_ids = sorted({lid for lid in location_ids if lid > 0})
        if not unique_ids:
            return []

        with request_session_scope(info) as session:
            allowed: list[int] = []
            for lid in unique_ids:
                if is_location_owner(session, lid, user_id, info=info):
                    allowed.append(lid)
            if not allowed:
                return []

            counts = dict(
                session.query(AnalyticsRun.location_id, func.count(AnalyticsRun.id))
                .filter(AnalyticsRun.location_id.in_(allowed))
                .group_by(AnalyticsRun.location_id)
                .all()
            )
            latest_rows = (
                session.query(AnalyticsRun)
                .filter(AnalyticsRun.location_id.in_(allowed))
                .order_by(AnalyticsRun.location_id.asc(), AnalyticsRun.id.desc())
                .all()
            )
            latest_by_location: dict[int, AnalyticsRun] = {}
            for row in latest_rows:
                if row.location_id not in latest_by_location:
                    latest_by_location[row.location_id] = row

            return [
                LocationAnalyticsSummaryType(
                    location_id=lid,
                    run_count=int(counts.get(lid, 0)),
                    latest_run=(
                        LocationAnalyticsRunSummaryType(
                            id=strawberry.ID(str(latest_by_location[lid].id)),
                            name=latest_by_location[lid].name,
                        )
                        if lid in latest_by_location
                        else None
                    ),
                )
                for lid in allowed
            ]

    @strawberry.field(description="Fetch one location by id if the caller has access.")
    def location(self, info: strawberry.Info, id: strawberry.ID) -> LocationType | None:
        user_id = user_id_from_info(info)
        if not user_id:
            return None
        with request_session_scope(info) as session:
            row = (
                session.query(Location)
                .options(selectinload(Location.opening_hours))
                .filter(Location.id == int(id))
                .one_or_none()
            )
            if row is None or not is_location_owner(session, row.id, user_id, info=info):
                return None
            return _location_to_gql(row)
