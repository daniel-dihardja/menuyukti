"""ORM → GraphQL mappers for curated menus."""

from __future__ import annotations

from graphql.data_sources.models.menu import Menu, MenuItem
from graphql.schema.types.menu import MenuItemType, MenuType


def menu_item_to_gql(row: MenuItem) -> MenuItemType:
    return MenuItemType(
        id=row.id,
        menu_id=row.menu_id,
        name=row.name,
        description=row.description,
        price=row.price,
        sort_order=row.sort_order,
        is_available=row.is_available,
        image_filename=row.image_filename,
    )


def menu_to_gql(row: Menu) -> MenuType:
    items = sorted(row.items, key=lambda item: (item.sort_order, item.id))
    return MenuType(
        id=row.id,
        location_id=row.location_id,
        title=row.title,
        items=[menu_item_to_gql(item) for item in items],
    )
