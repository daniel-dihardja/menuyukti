"""GraphQL types for Clerk-keyed guest point balances and ledger entries."""

from datetime import datetime

import strawberry


@strawberry.type(description="Guest point balance at one location.")
class MyPointBalanceType:
    location_id: int
    location_name: str
    balance: int


@strawberry.type(description="One ledger credit/debit for the authenticated guest.")
class MyPointEntryType:
    id: str
    location_id: int
    location_name: str
    amount: int
    action_key: str
    label: str | None
    created_at: datetime


@strawberry.type(description="Result of recording a guest point-earn event.")
class RecordPointEarnEventResultType:
    awarded: bool
    balance: int
