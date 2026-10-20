"""GraphQL types for the public location hub."""

from __future__ import annotations

from datetime import datetime

import strawberry

from graphql.schema.types.location_listing_kind import LocationListingKind


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
    reward_mode: str
    points_for_vote: int
    points_for_correct: int


@strawberry.type(
    description="Teaser for open votings shown on the public location hub.",
)
class PublicLocationVotingTeaserType:
    question: str
    open_count: int
    reward_mode: str
    points_for_vote: int


@strawberry.type(
    description="Teaser for a live pickup offer shown on the public location hub.",
)
class PublicLocationPickupOfferTeaserType:
    title: str
    available_until: datetime
    price: float | None


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
    listing_kind: LocationListingKind
    services: list[PublicLocationServiceType]
    header_image_filename: str | None
    workspace_id: strawberry.ID | None
    media_owner_clerk_user_id: str | None
    menu_dish_count: int | None
    menu_open_points: int | None
    prediction_teaser: PublicLocationPredictionTeaserType | None
    voting_teaser: PublicLocationVotingTeaserType | None
    pickup_offer_teaser: PublicLocationPickupOfferTeaserType | None


@strawberry.type(
    description="One discoverable venue card for the public explore directory.",
)
class PublicLocationDirectoryItemType:
    id: int
    name: str
    public_slug: str
    city: str | None
    listing_kind: LocationListingKind
    header_image_filename: str | None
    workspace_id: strawberry.ID | None
    media_owner_clerk_user_id: str | None
    menu_dish_count: int
    has_pickup_offer: bool
    pickup_offer_title: str | None
    pickup_offer_available_until: datetime | None
    pickup_offer_price: float | None


@strawberry.type(
    description=(
        "Public explore directory: distinct cities for chips plus matching venues "
        "with a published digital menu."
    )
)
class PublicLocationDirectoryType:
    cities: list[str]
    locations: list[PublicLocationDirectoryItemType]
