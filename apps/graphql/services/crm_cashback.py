"""CRM cashback award and redeem domain logic."""

from __future__ import annotations

import uuid

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from graphql.crm_auth.audit import record_audit_event
from graphql.data_sources.models.crm_app import CrmApp
from graphql.data_sources.models.crm_cashback_entry import CrmCashbackEntry
from graphql.data_sources.models.crm_customer import CrmCustomer
from graphql.schema.auth import is_workspace_member


def clean_cashback_label(label: str | None) -> str | None:
    if label is None:
        return None
    stripped = label.strip()
    if not stripped:
        return None
    if len(stripped) > 256:
        raise ValueError("label must be at most 256 characters for awardCrmCashback")
    return stripped


def award_or_redeem_cashback(
    session: Session,
    *,
    user_id: str,
    customer_id: uuid.UUID,
    payment_amount: int | None,
    redeem_amount: int | None,
    label: str | None,
) -> CrmCashbackEntry:
    """Create a cashback credit or debit entry. Caller must commit."""
    has_payment = payment_amount is not None
    has_redeem = redeem_amount is not None
    if has_payment == has_redeem:
        raise ValueError(
            "exactly one of paymentAmount or redeemAmount is required for awardCrmCashback"
        )

    label_clean = clean_cashback_label(label)

    customer = session.scalars(select(CrmCustomer).where(CrmCustomer.id == customer_id)).first()
    if customer is None:
        raise ValueError("CRM customer not found")
    app = session.scalars(select(CrmApp).where(CrmApp.id == customer.crm_app_id)).first()
    if app is None:
        raise ValueError("CRM app not found")
    if not is_workspace_member(session, app.workspace_id, user_id):
        raise PermissionError("Not allowed to award cashback for this CRM customer")

    if has_payment:
        assert payment_amount is not None
        if payment_amount <= 0:
            raise ValueError("paymentAmount must be a positive integer for awardCrmCashback")
        if payment_amount < app.cashback_threshold_amount:
            raise ValueError("paymentAmount is below the cashback threshold for awardCrmCashback")
        credit = (payment_amount * app.cashback_percent) // 100
        if credit <= 0:
            raise ValueError("computed cashback credit must be positive for awardCrmCashback")
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
        balance = session.scalar(
            select(func.coalesce(func.sum(CrmCashbackEntry.amount), 0)).where(
                CrmCashbackEntry.customer_id == customer.id
            )
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
    session.flush()
    return entry
