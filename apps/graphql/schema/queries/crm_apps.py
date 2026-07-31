"""Query workspace CRM apps."""

from __future__ import annotations

import strawberry
from sqlalchemy import select

from graphql.context import request_session_scope
from graphql.data_sources.models.crm_app import CrmApp
from graphql.limits import DEFAULT_LIST_FIRST, MAX_LIST_FIRST, clamp_page_size
from graphql.schema.auth import is_workspace_member, user_id_from_info
from graphql.schema.mappers.crm_app import crm_app_to_gql
from graphql.schema.types.crm_app import CrmAppType
from graphql.services.workspace_scope import workspace_ids_for_user


@strawberry.type
class CrmAppsQuery:
    @strawberry.field(description="List CRM apps in workspaces the current user belongs to.")
    def crm_apps(self, info: strawberry.Info, first: int | None = None) -> list[CrmAppType]:
        user_id = user_id_from_info(info)
        if not user_id:
            return []
        limit = clamp_page_size(first, default=DEFAULT_LIST_FIRST, maximum=MAX_LIST_FIRST)
        with request_session_scope(info) as session:
            workspace_ids = workspace_ids_for_user(session, user_id)
            if not workspace_ids:
                return []
            rows = session.scalars(
                select(CrmApp)
                .where(CrmApp.workspace_id.in_(workspace_ids))
                .order_by(CrmApp.title.asc())
                .limit(limit)
            ).all()
            return [crm_app_to_gql(row) for row in rows]

    @strawberry.field(description="Fetch one CRM app by id. Null when missing or access denied.")
    def crm_app(self, info: strawberry.Info, id: int) -> CrmAppType | None:
        user_id = user_id_from_info(info)
        if not user_id:
            return None
        with request_session_scope(info) as session:
            row = session.scalars(select(CrmApp).where(CrmApp.id == id)).first()
            if row is None:
                return None
            if not is_workspace_member(session, row.workspace_id, user_id):
                return None
            return crm_app_to_gql(row)
