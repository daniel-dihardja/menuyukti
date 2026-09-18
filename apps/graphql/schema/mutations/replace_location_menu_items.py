"""Replace all categories and items on a location's curated menu."""

from __future__ import annotations

import strawberry

from graphql.context import request_session_scope
from graphql.data_sources import Location
from graphql.schema.auth import require_location_owner, user_id_from_info
from graphql.schema.mappers.menu import menu_to_gql
from graphql.schema.types.menu import MenuCategoryInput, MenuType
from graphql.services.menu import (
    MenuCategoryReplaceInput,
    MenuItemReplaceInput,
    get_or_create_menu,
    replace_menu_categories,
)


@strawberry.type
class ReplaceLocationMenuItemsMutation:
    @strawberry.mutation(
        description=(
            "Replace all categories and items on the location's curated menu "
            "(creates the menu if needed). Pass an empty list to clear categories."
        )
    )
    def replace_location_menu_items(
        self,
        info: strawberry.Info,
        location_id: int,
        categories: list[MenuCategoryInput],
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
            domain_categories = [
                MenuCategoryReplaceInput(
                    name=category.name,
                    items=[
                        MenuItemReplaceInput(
                            name=item.name,
                            price=item.price,
                            description=item.description or "",
                            is_available=(True if item.is_available is None else item.is_available),
                            image_filename=item.image_filename,
                        )
                        for item in category.items
                    ],
                )
                for category in categories
            ]
            replace_menu_categories(session, menu, domain_categories)
            session.commit()
            session.refresh(menu)
            return menu_to_gql(menu)
