import strawberry
from strawberry import UNSET

from graphql.data_sources import Location, Node, SessionLocal
from graphql.schema.auth import is_workspace_member
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
        workspace_id: strawberry.ID,
        name: str,
        street: str | None = None,
        city: str | None = None,
        country: str | None = None,
        currency: str | None = UNSET,
    ) -> LocationType:
        user_id = _user_id(info)
        if not user_id:
            raise ValueError("Missing authenticated user for createLocation")
        wid = int(workspace_id)
        session = SessionLocal()
        try:
            if not is_workspace_member(session, wid, user_id):
                raise PermissionError("Access denied")
            loc_kwargs: dict[str, object] = {
                "workspace_id": wid,
                "name": name,
                "street": street,
                "city": city,
                "country": country,
                "clerk_user_id": user_id,
            }
            if currency is not UNSET:
                loc_kwargs["currency"] = currency
            loc = Location(**loc_kwargs)
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
                currency=loc.currency,
                node_id=str(loc.node_id) if loc.node_id is not None else None,
            )
        finally:
            session.close()
