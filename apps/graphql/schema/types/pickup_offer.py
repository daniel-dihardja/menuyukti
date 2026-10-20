"""GraphQL types for location-scoped pickup offers."""

from __future__ import annotations

from datetime import datetime

import strawberry


@strawberry.type(description="A location pickup offer guests can discover and collect.")
class PickupOfferType:
    id: int
    location_id: int
    location_name: str
    title: str
    description: str
    status: str
    available_from: datetime
    available_until: datetime
    price: float | None
    created_at: datetime
    is_live: bool


@strawberry.input(description="Create a pickup offer for a location.")
class CreatePickupOfferInput:
    location_id: int
    title: str
    description: str
    available_from: datetime
    available_until: datetime
    price: float | None = None
