"""GraphQL type for location visual style packs."""

from __future__ import annotations

import strawberry


@strawberry.type(
    description=(
        "Location-scoped visual style pack: textual rules plus one media-library "
        "reference image used when generating Instagram posts."
    )
)
class LocationStyleType:
    id: int
    location_id: int
    name: str
    rules: str
    reference_image_name: str
    is_default: bool
