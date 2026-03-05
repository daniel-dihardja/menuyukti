import strawberry

from graphql.data_sources import Location, SessionLocal


@strawberry.type
class LocationType:
    id: strawberry.ID
    name: str


@strawberry.type
class Query:
    @strawberry.field
    def hello(self) -> str:
        return "Hello from GraphQL"

    @strawberry.field
    def locations(self) -> list[LocationType]:
        session = SessionLocal()
        try:
            rows = session.query(Location).all()
            return [LocationType(id=row.id, name=row.name) for row in rows]
        finally:
            session.close()
