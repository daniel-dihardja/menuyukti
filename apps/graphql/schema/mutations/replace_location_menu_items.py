"""Replace all items on a location's curated menu."""

from __future__ import annotations

import strawberry

from graphql.context import request_session_scope
from graphql.data_sources import Location
from graphql.schema.auth import require_location_owner, user_id_from_info
from graphql.schema.mappers.menu import menu_to_gql
from graphql.schema.types.menu import MenuItemInput, MenuType
from graphql.services.menu import (
    MenuItemReplaceInput,
    get_or_create_menu,
    replace_menu_items,
)


@strawberry.type
class ReplaceLocationMenuItemsMutation:
    @strawberry.mutation(
        description=(
            "Replace all items on the location's curated menu (creates the menu if needed). "
            "Pass an empty list to clear items."
        )
    )
    def replace_location_menu_items(
        self,
        info: strawberry.Info,
        location_id: int,
        items: list[MenuItemInput],
    ) -> MenuType:
        user_id = user_id_from_info(info)
        if not user_id:
            raise ValueError("Missing authenticated user for replaceLocationMenuItems")

        with request_session_scope(info) as session:
            loc = session.get(Location, location_id)
            if loc is None:
                raise ValueError("Location not found")
            require_location_owner(session, location_id, user_id, info=info)

            menu = get_or_create_menu(session, location_id)
            domain_items = [
                MenuItemReplaceInput(
                    name=item.name,
                    price=item.price,
                    description=item.description or "",
                    is_available=True if item.is_available is None else item.is_available,
                    image_filename=item.image_filename,
                )
                for item in items
            ]
            replace_menu_items(session, menu, domain_items)
            session.commit()
            session.refresh(menu)
            return menu_to_gql(menu)
