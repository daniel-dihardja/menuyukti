"""Location-scoped curated menu helpers."""

from __future__ import annotations

from dataclasses import dataclass, field
from math import isfinite

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from graphql.data_sources.models.menu import (
    Menu,
    MenuCategory,
    MenuItem,
    MenuModifierGroup,
    MenuModifierOption,
)

NAME_MAX_LEN = 256
DESCRIPTION_MAX_LEN = 4000
TITLE_MAX_LEN = 256
CATEGORY_NAME_MAX_LEN = 256
IMAGE_FILENAME_MAX_LEN = 512
MODIFIER_NAME_MAX_LEN = 128


@dataclass(frozen=True)
class MenuModifierOptionReplaceInput:
    name: str
    price_delta: float = 0.0
    is_available: bool = True


@dataclass(frozen=True)
class MenuModifierGroupReplaceInput:
    name: str
    min_select: int = 0
    max_select: int = 1
    options: list[MenuModifierOptionReplaceInput] = field(default_factory=list)


@dataclass(frozen=True)
class MenuItemReplaceInput:
    name: str
    price: float
    description: str = ""
    is_available: bool = True
    image_filename: str | None = None
    modifier_groups: list[MenuModifierGroupReplaceInput] = field(default_factory=list)


@dataclass(frozen=True)
class MenuCategoryReplaceInput:
    name: str
    items: list[MenuItemReplaceInput] = field(default_factory=list)


def validate_modifier_option_fields(
    *,
    name: str,
    price_delta: float,
    is_available: bool = True,
) -> MenuModifierOptionReplaceInput:
    name_clean = name.strip()
    if not name_clean:
        raise ValueError("Modifier option name cannot be empty")
    if len(name_clean) > MODIFIER_NAME_MAX_LEN:
        raise ValueError("Modifier option name is too long")
    if not isfinite(price_delta):
        raise ValueError("Modifier option price_delta must be a number")
    return MenuModifierOptionReplaceInput(
        name=name_clean,
        price_delta=float(price_delta),
        is_available=bool(is_available),
    )


def validate_modifier_group_fields(
    *,
    name: str,
    min_select: int,
    max_select: int,
    options: list[MenuModifierOptionReplaceInput],
) -> MenuModifierGroupReplaceInput:
    name_clean = name.strip()
    if not name_clean:
        raise ValueError("Modifier group name cannot be empty")
    if len(name_clean) > MODIFIER_NAME_MAX_LEN:
        raise ValueError("Modifier group name is too long")
    if min_select < 0 or max_select < 1 or min_select > max_select:
        raise ValueError("Modifier group min_select/max_select are invalid")
    if not options:
        raise ValueError("Modifier group must have at least one option")
    if max_select > len(options):
        raise ValueError("Modifier group max_select cannot exceed option count")
    return MenuModifierGroupReplaceInput(
        name=name_clean,
        min_select=int(min_select),
        max_select=int(max_select),
        options=list(options),
    )


def validate_menu_item_fields(
    *,
    name: str,
    price: float,
    description: str | None = None,
    is_available: bool = True,
    image_filename: str | None = None,
    modifier_groups: list[MenuModifierGroupReplaceInput] | None = None,
) -> MenuItemReplaceInput:
    name_clean = name.strip()
    if not name_clean:
        raise ValueError("Menu item name cannot be empty")
    if len(name_clean) > NAME_MAX_LEN:
        raise ValueError("Menu item name is too long")

    if not isfinite(price) or price < 0:
        raise ValueError("Menu item price must be a non-negative number")

    desc_clean = (description or "").strip()
    if len(desc_clean) > DESCRIPTION_MAX_LEN:
        raise ValueError("Menu item description is too long")

    image_clean: str | None = None
    if image_filename is not None:
        image_clean = image_filename.strip() or None
        if image_clean is not None and len(image_clean) > IMAGE_FILENAME_MAX_LEN:
            raise ValueError("Menu item image filename is too long")

    groups = list(modifier_groups or [])
    return MenuItemReplaceInput(
        name=name_clean,
        price=float(price),
        description=desc_clean,
        is_available=bool(is_available),
        image_filename=image_clean,
        modifier_groups=groups,
    )


def validate_menu_category_fields(
    *,
    name: str,
    items: list[MenuItemReplaceInput],
) -> MenuCategoryReplaceInput:
    name_clean = name.strip()
    if not name_clean:
        raise ValueError("Menu category name cannot be empty")
    if len(name_clean) > CATEGORY_NAME_MAX_LEN:
        raise ValueError("Menu category name is too long")
    return MenuCategoryReplaceInput(name=name_clean, items=list(items))


def get_menu_for_location(session: Session, location_id: int) -> Menu | None:
    return session.scalar(
        select(Menu)
        .where(Menu.location_id == location_id)
        .options(
            selectinload(Menu.categories)
            .selectinload(MenuCategory.items)
            .selectinload(MenuItem.modifier_groups)
            .selectinload(MenuModifierGroup.options)
        )
    )


def get_or_create_menu(session: Session, location_id: int, *, title: str = "") -> Menu:
    existing = get_menu_for_location(session, location_id)
    if existing is not None:
        return existing

    title_clean = title.strip()
    if len(title_clean) > TITLE_MAX_LEN:
        raise ValueError("Menu title is too long")

    menu = Menu(location_id=location_id, title=title_clean)
    session.add(menu)
    session.flush()
    return menu


def replace_menu_categories(
    session: Session,
    menu: Menu,
    categories: list[MenuCategoryReplaceInput],
) -> Menu:
    """Replace all categories (and nested items/modifiers) on ``menu``."""
    validated: list[MenuCategoryReplaceInput] = []
    seen_names: set[str] = set()
    for category in categories:
        validated_items: list[MenuItemReplaceInput] = []
        for item in category.items:
            validated_groups = [
                validate_modifier_group_fields(
                    name=group.name,
                    min_select=group.min_select,
                    max_select=group.max_select,
                    options=[
                        validate_modifier_option_fields(
                            name=opt.name,
                            price_delta=opt.price_delta,
                            is_available=opt.is_available,
                        )
                        for opt in group.options
                    ],
                )
                for group in item.modifier_groups
            ]
            validated_items.append(
                validate_menu_item_fields(
                    name=item.name,
                    price=item.price,
                    description=item.description,
                    is_available=item.is_available,
                    image_filename=item.image_filename,
                    modifier_groups=validated_groups,
                )
            )
        validated_category = validate_menu_category_fields(
            name=category.name,
            items=validated_items,
        )
        key = validated_category.name.casefold()
        if key in seen_names:
            raise ValueError("Menu category names must be unique")
        seen_names.add(key)
        validated.append(validated_category)

    menu.categories.clear()
    session.flush()

    for cat_index, category in enumerate(validated):
        cat_row = MenuCategory(
            menu_id=menu.id,
            name=category.name,
            sort_order=cat_index,
        )
        menu.categories.append(cat_row)
        session.flush()
        for item_index, item in enumerate(category.items):
            item_row = MenuItem(
                menu_id=menu.id,
                category_id=cat_row.id,
                name=item.name,
                description=item.description,
                price=item.price,
                sort_order=item_index,
                is_available=item.is_available,
                image_filename=item.image_filename,
            )
            cat_row.items.append(item_row)
            session.flush()
            for group_index, group in enumerate(item.modifier_groups):
                group_row = MenuModifierGroup(
                    menu_item_id=item_row.id,
                    name=group.name,
                    min_select=group.min_select,
                    max_select=group.max_select,
                    sort_order=group_index,
                )
                item_row.modifier_groups.append(group_row)
                session.flush()
                for opt_index, opt in enumerate(group.options):
                    group_row.options.append(
                        MenuModifierOption(
                            group_id=group_row.id,
                            name=opt.name,
                            price_delta=opt.price_delta,
                            is_available=opt.is_available,
                            sort_order=opt_index,
                        )
                    )
    session.flush()
    refreshed = get_menu_for_location(session, menu.location_id)
    return refreshed or menu
