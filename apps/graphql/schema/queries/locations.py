import strawberry

from graphql.data_sources import Location, SessionLocal
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
            rows = (
                session.query(Location)
                .filter(Location.clerk_user_id == user_id)
                .all()
            )
            return [
                LocationType(
                    id=row.id,
                    name=row.name,
                    street=row.street,
                    city=row.city,
                    country=row.country,
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
            row = (
                session.query(Location)
                .filter(Location.id == int(id), Location.clerk_user_id == user_id)
                .first()
            )
            if row is None:
                return None
            return LocationType(
                id=row.id,
                name=row.name,
                street=row.street,
                city=row.city,
                country=row.country,
                node_id=str(row.node_id) if row.node_id is not None else None,
            )
        finally:
            session.close()
