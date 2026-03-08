import strawberry

from graphql.data_sources import Location, SessionLocal
from graphql.schema.types import LocationType


@strawberry.type
class CreateLocationMutation:
    @strawberry.mutation
    def create_location(
        self,
        name: str,
        street: str | None = None,
        city: str | None = None,
        country: str | None = None,
    ) -> LocationType:
        session = SessionLocal()
        try:
            loc = Location(name=name, street=street, city=city, country=country)
            session.add(loc)
            session.commit()
            session.refresh(loc)
            return LocationType(id=loc.id, name=loc.name, street=loc.street, city=loc.city, country=loc.country)
        finally:
            session.close()
