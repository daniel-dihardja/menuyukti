"""GraphQL types for location-scoped calendar entries."""

from __future__ import annotations

import strawberry


@strawberry.type(description="Stable reference to a media-library file.")
class CalendarMediaRefType:
    kind: str
    name: str


@strawberry.input(description="Input for attaching a media-library file to an entry.")
class CalendarMediaRefInput:
    kind: str
    name: str


@strawberry.type(description="A manually created calendar entry for a location.")
class CalendarEntryType:
    id: int
    location_id: int
    title: str
    description: str
    date: str
    time: str
    media_refs: list[CalendarMediaRefType]
