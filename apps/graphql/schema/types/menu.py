"""GraphQL types for location-scoped curated menus."""

from __future__ import annotations

import strawberry


@strawberry.type(description="One selectable option in a menu modifier group.")
class MenuModifierOptionType:
    id: int
    group_id: int
    name: str
    price_delta: float
    is_available: bool
    sort_order: int


@strawberry.type(description="Named choice group on a menu item (e.g. Size, Milk).")
class MenuModifierGroupType:
    id: int
    menu_item_id: int
    name: str
    min_select: int
    max_select: int
    sort_order: int
    options: list[MenuModifierOptionType]


@strawberry.type(description="One dish line on a location menu.")
class MenuItemType:
    id: int
    menu_id: int
    category_id: int
    name: str
    description: str
    price: float
    sort_order: int
    is_available: bool
    image_filename: str | None
    modifier_groups: list[MenuModifierGroupType]


@strawberry.type(description="Named section on a location menu (e.g. Food, Drink).")
class MenuCategoryType:
    id: int
    menu_id: int
    name: str
    sort_order: int
    items: list[MenuItemType]


@strawberry.type(description="Curated menu catalog for a location (one per location).")
class MenuType:
    id: int
    location_id: int
    title: str
    public_enabled: bool
    header_image_filename: str | None
    categories: list[MenuCategoryType]


@strawberry.input(description="Option payload for replaceLocationMenuItems.")
class MenuModifierOptionInput:
    name: str
    price_delta: float = 0.0
    is_available: bool | None = None


@strawberry.input(description="Modifier group payload for replaceLocationMenuItems.")
class MenuModifierGroupInput:
    name: str
    min_select: int = 0
    max_select: int = 1
    options: list[MenuModifierOptionInput]


@strawberry.input(description="Item payload for replaceLocationMenuItems.")
class MenuItemInput:
    name: str
    price: float
    description: str | None = None
    is_available: bool | None = None
    image_filename: str | None = None
    modifier_groups: list[MenuModifierGroupInput] | None = None


@strawberry.input(description="Category payload for replaceLocationMenuItems.")
class MenuCategoryInput:
    name: str
    items: list[MenuItemInput]
