"""GraphQL type for CRM enrolled devices."""

from __future__ import annotations

import uuid
from datetime import datetime

import strawberry


@strawberry.type(description="Device enrolled for a CRM customer.")
class CrmDeviceType:
    id: uuid.UUID
    platform: str
    label: str | None
    created_at: datetime
    last_seen_at: datetime | None
    revoked_at: datetime | None
