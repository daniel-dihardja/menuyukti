"""Award or redeem CRM cashback for a customer (staff)."""

from __future__ import annotations

import uuid

import strawberry
from sqlalchemy import func

from graphql.context import request_session_scope
from graphql.crm_auth.audit import record_audit_event
from graphql.data_sources.models.crm_app import CrmApp
from graphql.data_sources.models.crm_cashback_entry import CrmCashbackEntry
from graphql.data_sources.models.crm_customer import CrmCustomer
from graphql.schema.auth import is_workspace_member, user_id_from_info
from graphql.schema.crm_customer_map import cashback_entry_to_gql
from graphql.schema.types.crm_cashback_entry import CrmCashbackEntryType


def _clean_label(label: str | None) -> str | None:
    if label is None:
        return None
    stripped = label.strip()
    if not stripped:
        return None
    if len(stripped) > 256:
        raise ValueError("label must be at most 256 characters for awardCrmCashback")
    return stripped


@strawberry.type
class AwardCrmCashbackMutation:
    @strawberry.mutation(
        description=(
            "Award cashback from a payment total (applies app threshold/percent) "
            "or redeem a positive amount from the customer's balance. "
            "Pass exactly one of paymentAmount or redeemAmount."
        )
    )
    def award_crm_cashback(
        self,
        info: strawberry.Info,
        customer_id: uuid.UUID,
        payment_amount: int | None = None,
        redeem_amount: int | None = None,
        label: str | None = None,
    ) -> CrmCashbackEntryType:
        user_id = user_id_from_info(info)
        if not user_id:
            raise ValueError("Missing authenticated user for awardCrmCashback")

        has_payment = payment_amount is not None
        has_redeem = redeem_amount is not None
        if has_payment == has_redeem:
            raise ValueError(
                "exactly one of paymentAmount or redeemAmount is required for awardCrmCashback"
            )

        label_clean = _clean_label(label)

        with request_session_scope(info) as session:
            customer = session.query(CrmCustomer).filter(CrmCustomer.id == customer_id).first()
            if customer is None:
                raise ValueError("CRM customer not found")
            app = session.query(CrmApp).filter(CrmApp.id == customer.crm_app_id).first()
            if app is None:
                raise ValueError("CRM app not found")
            if not is_workspace_member(session, app.workspace_id, user_id):
                raise PermissionError("Not allowed to award cashback for this CRM customer")

            if has_payment:
                assert payment_amount is not None
                if payment_amount <= 0:
                    raise ValueError(
                        "paymentAmount must be a positive integer for awardCrmCashback"
                    )
                if payment_amount < app.cashback_threshold_amount:
                    raise ValueError(
                        "paymentAmount is below the cashback threshold for awardCrmCashback"
                    )
                credit = (payment_amount * app.cashback_percent) // 100
                if credit <= 0:
                    raise ValueError(
                        "computed cashback credit must be positive for awardCrmCashback"
                    )
                entry = CrmCashbackEntry(
                    customer_id=customer.id,
                    amount=credit,
                    payment_amount=payment_amount,
                    cashback_percent=app.cashback_percent,
                    label=label_clean,
                )
                audit_detail = (
                    f"mode:award;payment:{payment_amount};percent:{app.cashback_percent};"
                    f"credit:{credit};by:{user_id}"
                )
            else:
                assert redeem_amount is not None
                if redeem_amount <= 0:
                    raise ValueError("redeemAmount must be a positive integer for awardCrmCashback")
                balance = (
                    session.query(func.coalesce(func.sum(CrmCashbackEntry.amount), 0))
                    .filter(CrmCashbackEntry.customer_id == customer.id)
                    .scalar()
                )
                balance_int = int(balance or 0)
                if redeem_amount > balance_int:
                    raise ValueError("insufficient cashback balance for awardCrmCashback")
                entry = CrmCashbackEntry(
                    customer_id=customer.id,
                    amount=-redeem_amount,
                    payment_amount=None,
                    cashback_percent=None,
                    label=label_clean,
                )
                audit_detail = f"mode:redeem;redeem:{redeem_amount};by:{user_id}"

            session.add(entry)
            record_audit_event(
                session,
                event_type="cashback_award",
                crm_app_id=app.id,
                customer_id=customer.id,
                detail=audit_detail,
            )
            session.commit()
            session.refresh(entry)
            return cashback_entry_to_gql(entry)
