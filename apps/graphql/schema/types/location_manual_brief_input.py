"""GraphQL type for owner manual brief hints."""

from __future__ import annotations

import strawberry
from strawberry.scalars import JSON


@strawberry.type(description="Owner-provided click-first brief hints; not AI-generated.")
class LocationManualBriefInputType:
    location_id: int
    quick_profile: JSON
