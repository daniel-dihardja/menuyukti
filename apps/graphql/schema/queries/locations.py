import strawberry
from sqlalchemy import or_
from sqlalchemy.orm import selectinload

from graphql.data_sources import Location, SessionLocal, WorkspaceMembership
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


@strawberry.type
class LocationsQuery:
    @strawberry.field(
        description="All locations the current user can access (direct owner or workspace member)."
    )
    def locations(
        self, info: strawberry.Info, first: int | None = None
    ) -> list[LocationType]:
        user_id = user_id_from_info(info)
        if not user_id:
            return []
        limit = clamp_page_size(
            first,
            default=DEFAULT_LIST_FIRST,
            maximum=MAX_LIST_FIRST,
        )
        with SessionLocal() as session:
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

    @strawberry.field(description="Fetch one location by id if the caller has access.")
    def location(self, info: strawberry.Info, id: strawberry.ID) -> LocationType | None:
        user_id = user_id_from_info(info)
        if not user_id:
            return None
        with SessionLocal() as session:
            row = session.get(Location, int(id))
            if row is None or not is_location_owner(session, row.id, user_id):
                return None
            return _location_to_gql(row)
