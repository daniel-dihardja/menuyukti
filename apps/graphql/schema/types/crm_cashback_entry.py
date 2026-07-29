"""GraphQL type for CRM cashback ledger entries."""

from __future__ import annotations

import uuid
from datetime import datetime

import strawberry


@strawberry.type(description="Cashback ledger entry for a CRM customer.")
class CrmCashbackEntryType:
    id: uuid.UUID
    customer_id: uuid.UUID
    amount: int
    payment_amount: int | None
    cashback_percent: int | None
    label: str | None
    created_at: datetime
