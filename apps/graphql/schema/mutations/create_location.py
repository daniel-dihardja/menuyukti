import strawberry

from graphql.data_sources import Location, Node, SessionLocal
from graphql.schema.types import LocationType


def _user_id(info: strawberry.Info) -> str:
    ctx = info.context
    if isinstance(ctx, dict):
        return str(ctx.get("user_id") or "")
    return ""


@strawberry.type
class CreateLocationMutation:
    @strawberry.mutation
    def create_location(
        self,
        info: strawberry.Info,
        name: str,
        street: str | None = None,
        city: str | None = None,
        country: str | None = None,
    ) -> LocationType:
        user_id = _user_id(info)
        if not user_id:
            raise ValueError("Missing authenticated user for createLocation")
        session = SessionLocal()
        try:
            loc = Location(
                name=name,
                street=street,
                city=city,
                country=country,
                clerk_user_id=user_id,
            )
            session.add(loc)
            session.flush()

            loc_node = Node(
                parent_id=None,
                name=name,
                description=None,
                path="",
                node_type="location",
                location_id=loc.id,
                data=None,
            )
            session.add(loc_node)
            session.flush()
            loc_node.path = f"/{loc_node.id}"
            loc.node_id = loc_node.id

            session.commit()
            session.refresh(loc)
            return LocationType(
                id=loc.id,
                name=loc.name,
                street=loc.street,
                city=loc.city,
                country=loc.country,
                node_id=str(loc.node_id) if loc.node_id is not None else None,
            )
        finally:
            session.close()
