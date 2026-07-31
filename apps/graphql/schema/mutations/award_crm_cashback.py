"""Award or redeem CRM cashback for a customer (staff)."""

from __future__ import annotations

import uuid

import strawberry

from graphql.context import request_session_scope
from graphql.schema.auth import user_id_from_info
from graphql.schema.crm_customer_map import cashback_entry_to_gql
from graphql.schema.types.crm_cashback_entry import CrmCashbackEntryType
from graphql.services.crm_cashback import award_or_redeem_cashback


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

        with request_session_scope(info) as session:
            entry = award_or_redeem_cashback(
                session,
                user_id=user_id,
                customer_id=customer_id,
                payment_amount=payment_amount,
                redeem_amount=redeem_amount,
                label=label,
            )
            session.commit()
            session.refresh(entry)
            return cashback_entry_to_gql(entry)
