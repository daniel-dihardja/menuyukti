import strawberry
from sqlalchemy import or_

from graphql.data_sources import Location, SessionLocal, WorkspaceMembership
from graphql.schema.auth import is_location_owner
from graphql.schema.types import LocationType


def _user_id(info: strawberry.Info) -> str:
    ctx = info.context
    if isinstance(ctx, dict):
        return str(ctx.get("user_id") or "")
    return ""


@strawberry.type
class LocationsQuery:
    @strawberry.field
    def locations(self, info: strawberry.Info) -> list[LocationType]:
        user_id = _user_id(info)
        if not user_id:
            return []
        session = SessionLocal()
        try:
            workspace_ids = [
                w[0]
                for w in session.query(WorkspaceMembership.workspace_id)
                .filter(WorkspaceMembership.clerk_user_id == user_id)
                .all()
            ]
            access = [Location.clerk_user_id == user_id]
            if workspace_ids:
                access.append(Location.workspace_id.in_(workspace_ids))
            rows = session.query(Location).filter(or_(*access)).all()
            return [
                LocationType(
                    id=row.id,
                    name=row.name,
                    street=row.street,
                    city=row.city,
                    country=row.country,
                    currency=row.currency,
                    node_id=str(row.node_id) if row.node_id is not None else None,
                )
                for row in rows
            ]
        finally:
            session.close()

    @strawberry.field
    def location(self, info: strawberry.Info, id: strawberry.ID) -> LocationType | None:
        user_id = _user_id(info)
        if not user_id:
            return None
        session = SessionLocal()
        try:
            row = session.get(Location, int(id))
            if row is None or not is_location_owner(session, row.id, user_id):
                return None
            return LocationType(
                id=row.id,
                name=row.name,
                street=row.street,
                city=row.city,
                country=row.country,
                currency=row.currency,
                node_id=str(row.node_id) if row.node_id is not None else None,
            )
        finally:
            session.close()
