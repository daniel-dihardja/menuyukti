"""GraphQL types for location-scoped playbooks."""

from __future__ import annotations

import strawberry


@strawberry.type(description="A saved playbook instance for a location and date window.")
class PlaybookType:
    id: int
    location_id: int
    name: str
    playbook_type: str
    start_date: str
    end_date: str
