"""GraphQL type for location-scoped advisor memory."""

from __future__ import annotations

from datetime import datetime

import strawberry


@strawberry.type(
    description=(
        "Durable advisor-written notes for a location (preferences, constraints, outcomes). "
        "Separate from owner manualBriefInput.quickProfile."
    )
)
class LocationAdvisorMemoryType:
    location_id: int
    content: str
    updated_at: datetime | None
