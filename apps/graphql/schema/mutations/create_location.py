import strawberry
from strawberry import UNSET

from graphql.context import request_session_scope
from graphql.schema.auth import is_workspace_member, user_id_from_info
from graphql.schema.mappers.location import location_to_gql
from graphql.schema.types import LocationType
from graphql.services.location import create_location_row


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
            loc = create_location_row(
                session,
                workspace_id=wid,
                clerk_user_id=user_id,
                name=name,
                street=street,
                city=city,
                country=country,
                currency=currency if currency is not UNSET else None,
                include_currency=currency is not UNSET,
            )
            session.commit()
            session.refresh(loc)
            return location_to_gql(loc)
