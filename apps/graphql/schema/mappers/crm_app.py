"""ORM → GraphQL mappers for CRM apps."""

from __future__ import annotations

from graphql.data_sources.models.crm_app import CrmApp
from graphql.schema.types.crm_app import CrmAppType


def crm_app_to_gql(row: CrmApp) -> CrmAppType:
    return CrmAppType(
        id=row.id,
        app_id=row.app_id,
        title=row.title,
        cashback_threshold_amount=row.cashback_threshold_amount,
        cashback_percent=row.cashback_percent,
        workspace_id=row.workspace_id,
        created_by_clerk_user_id=row.created_by_clerk_user_id,
        created_at=row.created_at,
        updated_at=row.updated_at,
    )
