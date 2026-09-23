"""Public GraphQL types for the location digital menu frontpage."""

from __future__ import annotations

import strawberry


@strawberry.type(description="One available item on the public digital menu.")
class PublicMenuItemType:
    name: str
    price: float
    sort_order: int


@strawberry.type(description="One category section on the public digital menu.")
class PublicMenuCategoryType:
    name: str
    sort_order: int
    items: list[PublicMenuItemType]


@strawberry.type(
    description=(
        "Public digital menu for a location. "
        "Null when the slug is unknown or the menu is not published."
    )
)
class PublicLocationMenuType:
    location_id: int
    name: str
    tagline: str | None
    public_slug: str
    currency: str | None
    categories: list[PublicMenuCategoryType]
