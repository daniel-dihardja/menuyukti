"""GraphQL types for CRM customers (registrations list + detail)."""

from __future__ import annotations

import uuid
from datetime import datetime
from enum import Enum

import strawberry

from graphql.schema.types.crm_cashback_entry import CrmCashbackEntryType
from graphql.schema.types.crm_device import CrmDeviceType


@strawberry.enum(description="Registration status derived from enrolled devices.")
class CrmCustomerStatus(Enum):
    ACTIVE = "active"
    REVOKED = "revoked"
    NONE = "none"


@strawberry.type(description="Customer enrolled in a CRM app.")
class CrmCustomerType:
    id: uuid.UUID
    app_id: int = strawberry.field(description="Internal CRM app id (crm_app.id).")
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
    cashback_balance: int = strawberry.field(
        default=0,
        description="Sum of cashback ledger amounts in IDR (populated on crmCustomer detail).",
    )
    cashback_entries: list[CrmCashbackEntryType] = strawberry.field(
        default_factory=list,
        description="Recent cashback ledger entries (populated on crmCustomer detail).",
    )
