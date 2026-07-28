"""Update a workspace CRM app."""

from __future__ import annotations

import strawberry

from graphql.context import request_session_scope
from graphql.data_sources.models.crm_app import CrmApp
from graphql.schema.auth import is_workspace_member, user_id_from_info
from graphql.schema.queries.crm_apps import _crm_app_to_gql
from graphql.schema.types.crm_app import CrmAppType


@strawberry.type
class UpdateCrmAppMutation:
    @strawberry.mutation(description="Update a CRM app by id.")
    def update_crm_app(self, info: strawberry.Info, id: int, title: str) -> CrmAppType:
        user_id = user_id_from_info(info)
        if not user_id:
            raise ValueError("Missing authenticated user for updateCrmApp")

        title_clean = title.strip()
        if not title_clean:
            raise ValueError("title is required for updateCrmApp")
        if len(title_clean) > 256:
            raise ValueError("title must be at most 256 characters for updateCrmApp")

        with request_session_scope(info) as session:
            row = session.query(CrmApp).filter(CrmApp.id == id).first()
            if row is None:
                raise ValueError("CRM app not found")
            if not is_workspace_member(session, row.workspace_id, user_id):
                raise PermissionError("Not allowed to update this CRM app")

            row.title = title_clean
            session.commit()
            session.refresh(row)
            return _crm_app_to_gql(row)
