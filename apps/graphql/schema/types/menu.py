"""GraphQL types for location-scoped curated menus."""

from __future__ import annotations

import strawberry


@strawberry.type(description="One dish line on a location menu.")
class MenuItemType:
    id: int
    menu_id: int
    name: str
    description: str
    price: float
    sort_order: int
    is_available: bool
    image_filename: str | None


@strawberry.type(description="Curated menu catalog for a location (one per location).")
class MenuType:
    id: int
    location_id: int
    title: str
    items: list[MenuItemType]


@strawberry.input(description="Item payload for replaceLocationMenuItems.")
class MenuItemInput:
    name: str
    price: float
    description: str | None = None
    is_available: bool | None = None
    image_filename: str | None = None
