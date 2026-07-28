"""Award cashback to a CRM customer (staff)."""

from __future__ import annotations

import uuid

import strawberry

from graphql.context import request_session_scope
from graphql.crm_auth.audit import record_audit_event
from graphql.data_sources.models.crm_app import CrmApp
from graphql.data_sources.models.crm_cashback_entry import CrmCashbackEntry
from graphql.data_sources.models.crm_customer import CrmCustomer
from graphql.schema.auth import is_workspace_member, user_id_from_info
from graphql.schema.types.crm_cashback_entry import CrmCashbackEntryType


def _entry_to_gql(row: CrmCashbackEntry) -> CrmCashbackEntryType:
    return CrmCashbackEntryType(
        id=row.id,
        customer_id=row.customer_id,
        amount=row.amount,
        label=row.label,
        created_at=row.created_at,  # type: ignore[arg-type]
    )


@strawberry.type
class AwardCrmCashbackMutation:
    @strawberry.mutation(
        description=(
            "Adjust a CRM customer's cashback balance: positive amount credits, "
            "negative amount subtracts (e.g. when redeemed with a payment)."
        )
    )
    def award_crm_cashback(
        self,
        info: strawberry.Info,
        customer_id: uuid.UUID,
        amount: int,
        label: str | None = None,
    ) -> CrmCashbackEntryType:
        user_id = user_id_from_info(info)
        if not user_id:
            raise ValueError("Missing authenticated user for awardCrmCashback")

        if amount == 0:
            raise ValueError("amount must be a non-zero integer for awardCrmCashback")

        label_clean: str | None = None
        if label is not None:
            stripped = label.strip()
            if stripped:
                if len(stripped) > 256:
                    raise ValueError("label must be at most 256 characters for awardCrmCashback")
                label_clean = stripped

        with request_session_scope(info) as session:
            customer = session.query(CrmCustomer).filter(CrmCustomer.id == customer_id).first()
            if customer is None:
                raise ValueError("CRM customer not found")
            app = session.query(CrmApp).filter(CrmApp.id == customer.crm_app_id).first()
            if app is None:
                raise ValueError("CRM app not found")
            if not is_workspace_member(session, app.workspace_id, user_id):
                raise PermissionError("Not allowed to award cashback for this CRM customer")

            entry = CrmCashbackEntry(
                customer_id=customer.id,
                amount=amount,
                label=label_clean,
            )
            session.add(entry)
            record_audit_event(
                session,
                event_type="cashback_award",
                crm_app_id=app.id,
                customer_id=customer.id,
                detail=f"amount:{amount};by:{user_id}",
            )
            session.commit()
            session.refresh(entry)
            return _entry_to_gql(entry)
