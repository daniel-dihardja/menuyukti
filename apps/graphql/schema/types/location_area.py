"""GraphQL types for location areas."""

from __future__ import annotations

import strawberry


@strawberry.type(description="Named area within a location (e.g. Main room, Bar).")
class LocationAreaType:
    id: strawberry.ID
    location_id: strawberry.ID
    name: str
    sort_order: int
