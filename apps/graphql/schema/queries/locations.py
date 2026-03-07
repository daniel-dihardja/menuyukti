import strawberry

from graphql.data_sources import Location, SessionLocal
from graphql.schema.types import LocationType


@strawberry.type
class LocationsQuery:
    @strawberry.field
    def locations(self) -> list[LocationType]:
        session = SessionLocal()
        try:
            rows = session.query(Location).all()
            return [LocationType(id=row.id, name=row.name) for row in rows]
        finally:
            session.close()
