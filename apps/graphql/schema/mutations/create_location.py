import strawberry

from graphql.data_sources import Location, SessionLocal
from graphql.schema.types import LocationType


@strawberry.type
class CreateLocationMutation:
    @strawberry.mutation
    def create_location(self, name: str) -> LocationType:
        session = SessionLocal()
        try:
            loc = Location(name=name)
            session.add(loc)
            session.commit()
            session.refresh(loc)
            return LocationType(id=loc.id, name=loc.name)
        finally:
            session.close()
