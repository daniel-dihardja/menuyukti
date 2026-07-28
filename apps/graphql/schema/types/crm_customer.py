"""GraphQL types for CRM customers (registrations list + detail)."""

from __future__ import annotations

import uuid
from datetime import datetime
from enum import Enum

import strawberry

from graphql.schema.types.crm_device import CrmDeviceType


@strawberry.enum(description="Registration status derived from enrolled devices.")
class CrmCustomerStatus(Enum):
    ACTIVE = "active"
    REVOKED = "revoked"
    NONE = "none"


@strawberry.type(description="Customer enrolled in a CRM app.")
class CrmCustomerType:
    id: uuid.UUID
    phone_masked: str
    given_name: str | None
    family_name: str | None
    created_at: datetime
    device_count: int
    last_seen_at: datetime | None
    status: CrmCustomerStatus
    devices: list[CrmDeviceType] = strawberry.field(
        default_factory=list,
        description="Enrolled devices (populated on crmCustomer detail).",
    )
