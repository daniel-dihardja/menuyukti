"""GraphQL types for the public location hub."""

from __future__ import annotations

import strawberry


@strawberry.type(description="One guest-facing service entry on a public location hub.")
class PublicLocationServiceType:
    key: str
    href_segment: str
    available: bool


@strawberry.type(
    description=(
        "Public location hub by slug. Returned when the slug exists; "
        "services may all be unavailable (greeting-only home)."
    )
)
class PublicLocationType:
    id: int
    name: str
    public_slug: str
    services: list[PublicLocationServiceType]
