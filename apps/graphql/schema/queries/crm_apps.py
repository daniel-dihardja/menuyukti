"""Query workspace CRM apps."""

from __future__ import annotations

import strawberry

from graphql.context import request_session_scope
from graphql.data_sources.models.crm_app import CrmApp
from graphql.schema.auth import is_workspace_member, user_id_from_info
from graphql.schema.types.crm_app import CrmAppType
from graphql.services.workspace_scope import workspace_ids_for_user


def _crm_app_to_gql(row: CrmApp) -> CrmAppType:
    return CrmAppType(
        id=row.id,
        app_id=row.app_id,
        title=row.title,
        workspace_id=row.workspace_id,
        created_by_clerk_user_id=row.created_by_clerk_user_id,
        created_at=row.created_at,  # type: ignore[arg-type]
        updated_at=row.updated_at,  # type: ignore[arg-type]
    )


@strawberry.type
class CrmAppsQuery:
    @strawberry.field(description="List CRM apps in workspaces the current user belongs to.")
    def crm_apps(self, info: strawberry.Info) -> list[CrmAppType]:
        user_id = user_id_from_info(info)
        if not user_id:
            return []
        with request_session_scope(info) as session:
            workspace_ids = workspace_ids_for_user(session, user_id)
            if not workspace_ids:
                return []
            rows = (
                session.query(CrmApp)
                .filter(CrmApp.workspace_id.in_(workspace_ids))
                .order_by(CrmApp.title.asc())
                .all()
            )
            return [_crm_app_to_gql(row) for row in rows]

    @strawberry.field(description="Fetch one CRM app by id. Null when missing or access denied.")
    def crm_app(self, info: strawberry.Info, id: int) -> CrmAppType | None:
        user_id = user_id_from_info(info)
        if not user_id:
            return None
        with request_session_scope(info) as session:
            row = session.query(CrmApp).filter(CrmApp.id == id).first()
            if row is None:
                return None
            if not is_workspace_member(session, row.workspace_id, user_id):
                return None
            return _crm_app_to_gql(row)
