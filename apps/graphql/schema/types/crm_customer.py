"""GraphQL type for CRM customers (registrations list)."""

from __future__ import annotations

import uuid
from datetime import datetime

import strawberry


@strawberry.type(description="Customer enrolled in a CRM app.")
class CrmCustomerType:
    id: uuid.UUID
    phone_masked: str
    created_at: datetime
    device_count: int
