import strawberry
from strawberry import UNSET

from graphql.context import request_session_scope
from graphql.data_sources import Location
from graphql.schema.auth import is_workspace_member, user_id_from_info
from graphql.schema.types import LocationType


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
        user_id = user_id_from_info(info)
        if not user_id:
            raise ValueError("Missing authenticated user for createLocation")
        wid = int(workspace_id)
        with request_session_scope(info) as session:
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
                workspace_id=str(loc.workspace_id) if loc.workspace_id is not None else None,
                opening_hours=[],
            )
