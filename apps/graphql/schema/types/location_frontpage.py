"""GraphQL type for location guest frontpage configuration."""

from __future__ import annotations

import strawberry


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
