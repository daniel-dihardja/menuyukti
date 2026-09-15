"""Public GraphQL types for the curated location guest wall."""

from __future__ import annotations

import strawberry


@strawberry.type(description="One curated tile on the public guest wall.")
class PublicWallTileType:
    kind: str
    key: str
    title: str
    description: str | None
    image_filename: str | None


@strawberry.type(
    description=(
        "Public guest wall for a location (curated favorites/combos). "
        "Null when the slug is unknown or the wall is not enabled."
    )
)
class PublicLocationWallType:
    location_id: int
    name: str
    tagline: str | None
    public_slug: str
    workspace_id: strawberry.ID | None
    media_owner_clerk_user_id: str | None
    tiles: list[PublicWallTileType]
