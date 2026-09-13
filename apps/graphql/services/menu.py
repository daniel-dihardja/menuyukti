"""Location-scoped curated menu helpers."""

from __future__ import annotations

from dataclasses import dataclass, field
from math import isfinite

from sqlalchemy import select
from sqlalchemy.orm import Session

from graphql.data_sources.models.menu import Menu, MenuCategory, MenuItem

NAME_MAX_LEN = 256
DESCRIPTION_MAX_LEN = 4000
TITLE_MAX_LEN = 256
CATEGORY_NAME_MAX_LEN = 256
IMAGE_FILENAME_MAX_LEN = 512


@dataclass(frozen=True)
class MenuItemReplaceInput:
    name: str
    price: float
    description: str = ""
    is_available: bool = True
    image_filename: str | None = None


@dataclass(frozen=True)
class MenuCategoryReplaceInput:
    name: str
    items: list[MenuItemReplaceInput] = field(default_factory=list)


def validate_menu_item_fields(
    *,
    name: str,
    price: float,
    description: str | None = None,
    is_available: bool = True,
    image_filename: str | None = None,
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

    return MenuItemReplaceInput(
        name=name_clean,
        price=float(price),
        description=desc_clean,
        is_available=bool(is_available),
        image_filename=image_clean,
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
    return session.scalar(select(Menu).where(Menu.location_id == location_id))


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
    """Replace all categories (and nested items) on ``menu`` (order preserved as sort_order)."""
    validated: list[MenuCategoryReplaceInput] = []
    seen_names: set[str] = set()
    for category in categories:
        validated_items = [
            validate_menu_item_fields(
                name=item.name,
                price=item.price,
                description=item.description,
                is_available=item.is_available,
                image_filename=item.image_filename,
            )
            for item in category.items
        ]
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
            cat_row.items.append(
                MenuItem(
                    menu_id=menu.id,
                    category_id=cat_row.id,
                    name=item.name,
                    description=item.description,
                    price=item.price,
                    sort_order=item_index,
                    is_available=item.is_available,
                    image_filename=item.image_filename,
                )
            )
    session.flush()
    return menu
