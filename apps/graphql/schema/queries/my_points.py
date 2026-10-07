"""Guest queries: myPointBalances and myPointEntries (Clerk-keyed)."""

from __future__ import annotations

import strawberry

from graphql.context import request_session_scope
from graphql.schema.auth import user_id_from_info
from graphql.schema.types.point_ledger import MyPointBalanceType, MyPointEntryType
from graphql.services import point_ledger as ledger_svc


def _balance_to_gql(row: ledger_svc.PointBalanceView) -> MyPointBalanceType:
    return MyPointBalanceType(
        location_id=row.location_id,
        location_name=row.location_name,
        balance=row.balance,
    )


def _entry_to_gql(row: ledger_svc.PointEntryView) -> MyPointEntryType:
    return MyPointEntryType(
        id=row.id,
        location_id=row.location_id,
        location_name=row.location_name,
        amount=row.amount,
        action_key=row.action_key,
        label=row.label,
        created_at=row.created_at,
    )


@strawberry.type
class MyPointsQuery:
    @strawberry.field(
        description=(
            "Point balances for the authenticated Clerk user, one row per location "
            "with ledger activity. Empty when unauthenticated or no activity."
        )
    )
    def my_point_balances(self, info: strawberry.Info) -> list[MyPointBalanceType]:
        user_id = user_id_from_info(info)
        if not user_id:
            return []
        with request_session_scope(info) as session:
            return [
                _balance_to_gql(row)
                for row in ledger_svc.list_balances_for_user(session, clerk_user_id=user_id)
            ]

    @strawberry.field(
        description=(
            "Recent point ledger entries for the authenticated Clerk user "
            "(newest first). Empty when unauthenticated."
        )
    )
    def my_point_entries(
        self,
        info: strawberry.Info,
        limit: int = 20,
    ) -> list[MyPointEntryType]:
        user_id = user_id_from_info(info)
        if not user_id:
            return []
        with request_session_scope(info) as session:
            return [
                _entry_to_gql(row)
                for row in ledger_svc.list_entries_for_user(
                    session, clerk_user_id=user_id, limit=limit
                )
            ]
