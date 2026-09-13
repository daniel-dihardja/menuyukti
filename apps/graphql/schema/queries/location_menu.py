"""Query the curated menu for a location."""

from __future__ import annotations

import strawberry

from graphql.context import request_session_scope
from graphql.schema.auth import is_location_owner, user_id_from_info
from graphql.schema.mappers.menu import menu_to_gql
from graphql.schema.types.menu import MenuType
from graphql.services.menu import get_menu_for_location


@strawberry.type
class LocationMenuQuery:
    @strawberry.field(
        description=(
            "Curated guest menu for a location. Null when missing, unauthenticated, "
            "or the caller is not an owner."
        )
    )
    def location_menu(self, info: strawberry.Info, location_id: int) -> MenuType | None:
        user_id = user_id_from_info(info)
        if not user_id:
            return None

        with request_session_scope(info) as session:
            if not is_location_owner(session, location_id, user_id, info=info):
                return None
            row = get_menu_for_location(session, location_id)
            if row is None:
                return None
            return menu_to_gql(row)
