"""GraphQL enum for location listing kind."""

from __future__ import annotations

from enum import StrEnum

import strawberry

from graphql.domain.location_listing_kind import (
    LISTING_KIND_COMMERCIAL,
    LISTING_KIND_COMMUNITY,
)


@strawberry.enum(
    description="Guest-facing listing classification for a location (commercial vs community).",
)
class LocationListingKind(StrEnum):
    commercial = LISTING_KIND_COMMERCIAL
    community = LISTING_KIND_COMMUNITY


def listing_kind_to_gql(raw: str | None) -> LocationListingKind:
    value = (raw or LISTING_KIND_COMMERCIAL).strip().lower()
    try:
        return LocationListingKind(value)
    except ValueError:
        return LocationListingKind.commercial
