"""GraphQL types for the public location hub."""

from __future__ import annotations

import strawberry


@strawberry.type(description="One guest-facing service entry on a public location hub.")
class PublicLocationServiceType:
    key: str
    href_segment: str
    available: bool


@strawberry.type(
    description="Teaser for open predictions shown on the public location hub.",
)
class PublicLocationPredictionTeaserType:
    question: str
    open_count: int


@strawberry.type(
    description="Teaser for open votings shown on the public location hub.",
)
class PublicLocationVotingTeaserType:
    question: str
    open_count: int


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
    header_image_filename: str | None
    workspace_id: strawberry.ID | None
    media_owner_clerk_user_id: str | None
    menu_dish_count: int | None
    prediction_teaser: PublicLocationPredictionTeaserType | None
    voting_teaser: PublicLocationVotingTeaserType | None
