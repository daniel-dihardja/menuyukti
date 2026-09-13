"""Location-scoped curated menu helpers."""

from __future__ import annotations

from dataclasses import dataclass
from math import isfinite

from sqlalchemy import select
from sqlalchemy.orm import Session

from graphql.data_sources.models.menu import Menu, MenuItem

NAME_MAX_LEN = 256
DESCRIPTION_MAX_LEN = 4000
TITLE_MAX_LEN = 256
IMAGE_FILENAME_MAX_LEN = 512


@dataclass(frozen=True)
class MenuItemReplaceInput:
    name: str
    price: float
    description: str = ""
    is_available: bool = True
    image_filename: str | None = None


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


def replace_menu_items(
    session: Session,
    menu: Menu,
    items: list[MenuItemReplaceInput],
) -> Menu:
    """Replace all items on ``menu`` with ``items`` (order preserved as sort_order)."""
    validated = [
        validate_menu_item_fields(
            name=item.name,
            price=item.price,
            description=item.description,
            is_available=item.is_available,
            image_filename=item.image_filename,
        )
        for item in items
    ]

    menu.items.clear()
    session.flush()

    for index, item in enumerate(validated):
        menu.items.append(
            MenuItem(
                name=item.name,
                description=item.description,
                price=item.price,
                sort_order=index,
                is_available=item.is_available,
                image_filename=item.image_filename,
            )
        )
    session.flush()
    return menu
