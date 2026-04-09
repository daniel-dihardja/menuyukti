import strawberry
from sqlalchemy import or_

from graphql.data_sources import Location, SessionLocal, WorkspaceMembership
from graphql.schema.auth import is_location_owner, user_id_from_info
from graphql.schema.types import LocationType


@strawberry.type
class LocationsQuery:
    @strawberry.field
    def locations(self, info: strawberry.Info) -> list[LocationType]:
        user_id = user_id_from_info(info)
        if not user_id:
            return []
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

    @strawberry.field
    def location(self, info: strawberry.Info, id: strawberry.ID) -> LocationType | None:
        user_id = user_id_from_info(info)
        if not user_id:
            return None
        with SessionLocal() as session:
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
