"""Update a workspace CRM app."""

from __future__ import annotations

import strawberry

from graphql.context import request_session_scope
from graphql.data_sources.models.crm_app import CrmApp
from graphql.schema.auth import is_workspace_member, user_id_from_info
from graphql.schema.mappers.crm_app import crm_app_to_gql
from graphql.schema.types.crm_app import CrmAppType


@strawberry.type
class UpdateCrmAppMutation:
    @strawberry.mutation(description="Update a CRM app by id.")
    def update_crm_app(
        self,
        info: strawberry.Info,
        id: int,
        title: str,
        cashback_threshold_amount: int | None = None,
        cashback_percent: int | None = None,
    ) -> CrmAppType:
        user_id = user_id_from_info(info)
        if not user_id:
            raise ValueError("Missing authenticated user for updateCrmApp")

        title_clean = title.strip()
        if not title_clean:
            raise ValueError("title is required for updateCrmApp")
        if len(title_clean) > 256:
            raise ValueError("title must be at most 256 characters for updateCrmApp")

        if cashback_threshold_amount is not None and cashback_threshold_amount < 0:
            raise ValueError("cashbackThresholdAmount must be >= 0 for updateCrmApp")
        if cashback_percent is not None and (cashback_percent < 0 or cashback_percent > 100):
            raise ValueError("cashbackPercent must be between 0 and 100 for updateCrmApp")

        with request_session_scope(info) as session:
            row = session.query(CrmApp).filter(CrmApp.id == id).first()
            if row is None:
                raise ValueError("CRM app not found")
            if not is_workspace_member(session, row.workspace_id, user_id):
                raise PermissionError("Not allowed to update this CRM app")

            row.title = title_clean
            if cashback_threshold_amount is not None:
                row.cashback_threshold_amount = cashback_threshold_amount
            if cashback_percent is not None:
                row.cashback_percent = cashback_percent
            session.commit()
            session.refresh(row)
            return crm_app_to_gql(row)
