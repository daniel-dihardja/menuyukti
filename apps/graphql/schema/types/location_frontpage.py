"""GraphQL type for location guest frontpage configuration."""

from __future__ import annotations

import strawberry


@strawberry.type(
    description=(
        "Operator override for a guest-favorite dish "
        "(optional image, description, and publish flag)."
    )
)
class FrontpageFavoriteImageType:
    menu: str
    image_filename: str | None
    description: str | None
    published: bool


@strawberry.input(
    description=(
        "Input for attaching an optional media image, description, and publish flag "
        "to a guest favorite."
    )
)
class FrontpageFavoriteImageInput:
    menu: str
    image_filename: str | None = None
    description: str | None = None
    published: bool = True


@strawberry.type(
    description=(
        "Operator override for an often-ordered-together combo "
        "(optional image, description, and publish flag)."
    )
)
class FrontpageComboImageType:
    menu_a: str
    menu_b: str
    image_filename: str | None
    description: str | None
    published: bool


@strawberry.input(
    description=(
        "Input for attaching an optional media image, description, and publish flag "
        "to a popular combo."
    )
)
class FrontpageComboImageInput:
    menu_a: str
    menu_b: str
    image_filename: str | None = None
    description: str | None = None
    published: bool = True


@strawberry.type(
    description=(
        "Operator settings for the location guest frontpage: tagline and which "
        "sales-driven sections to show."
    )
)
class LocationFrontpageType:
    location_id: int
    tagline: str | None
    show_guest_favorites: bool
    show_popular_combos: bool
    favorite_images: list[FrontpageFavoriteImageType]
    combo_images: list[FrontpageComboImageType]
