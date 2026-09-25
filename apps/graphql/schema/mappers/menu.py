"""ORM → GraphQL mappers for curated menus."""

from __future__ import annotations

from graphql.data_sources.models.menu import (
    Menu,
    MenuCategory,
    MenuItem,
    MenuModifierGroup,
    MenuModifierOption,
)
from graphql.schema.types.menu import (
    MenuCategoryType,
    MenuItemType,
    MenuModifierGroupType,
    MenuModifierOptionType,
    MenuType,
)


def menu_modifier_option_to_gql(row: MenuModifierOption) -> MenuModifierOptionType:
    return MenuModifierOptionType(
        id=row.id,
        group_id=row.group_id,
        name=row.name,
        price_delta=float(row.price_delta or 0),
        is_available=bool(row.is_available),
        sort_order=row.sort_order,
    )


def menu_modifier_group_to_gql(row: MenuModifierGroup) -> MenuModifierGroupType:
    options = sorted(row.options, key=lambda opt: (opt.sort_order, opt.id))
    return MenuModifierGroupType(
        id=row.id,
        menu_item_id=row.menu_item_id,
        name=row.name,
        min_select=row.min_select,
        max_select=row.max_select,
        sort_order=row.sort_order,
        options=[menu_modifier_option_to_gql(opt) for opt in options],
    )


def menu_item_to_gql(row: MenuItem) -> MenuItemType:
    groups = sorted(row.modifier_groups, key=lambda g: (g.sort_order, g.id))
    return MenuItemType(
        id=row.id,
        menu_id=row.menu_id,
        category_id=row.category_id,
        name=row.name,
        description=row.description,
        price=row.price,
        sort_order=row.sort_order,
        is_available=row.is_available,
        image_filename=row.image_filename,
        modifier_groups=[menu_modifier_group_to_gql(g) for g in groups],
    )


def menu_category_to_gql(row: MenuCategory) -> MenuCategoryType:
    items = sorted(row.items, key=lambda item: (item.sort_order, item.id))
    return MenuCategoryType(
        id=row.id,
        menu_id=row.menu_id,
        name=row.name,
        sort_order=row.sort_order,
        items=[menu_item_to_gql(item) for item in items],
    )


def menu_to_gql(row: Menu) -> MenuType:
    categories = sorted(row.categories, key=lambda cat: (cat.sort_order, cat.id))
    return MenuType(
        id=row.id,
        location_id=row.location_id,
        title=row.title,
        public_enabled=bool(row.public_enabled),
        header_image_filename=row.header_image_filename,
        categories=[menu_category_to_gql(cat) for cat in categories],
    )
