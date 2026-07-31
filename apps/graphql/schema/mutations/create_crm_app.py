"""Create a workspace CRM app."""

from __future__ import annotations

import strawberry

from graphql.context import request_session_scope
from graphql.data_sources.models.crm_app import CrmApp
from graphql.schema.auth import user_id_from_info
from graphql.schema.mappers.crm_app import crm_app_to_gql
from graphql.schema.types.crm_app import CrmAppType
from graphql.services.workspace_scope import primary_workspace_id


@strawberry.type
class CreateCrmAppMutation:
    @strawberry.mutation(description="Create a CRM app in the caller's primary workspace.")
    def create_crm_app(self, info: strawberry.Info, title: str) -> CrmAppType:
        user_id = user_id_from_info(info)
        if not user_id:
            raise ValueError("Missing authenticated user for createCrmApp")

        title_clean = title.strip()
        if not title_clean:
            raise ValueError("title is required for createCrmApp")
        if len(title_clean) > 256:
            raise ValueError("title must be at most 256 characters for createCrmApp")

        with request_session_scope(info) as session:
            workspace_id = primary_workspace_id(session, user_id)
            if workspace_id is None:
                raise ValueError("No workspace found for createCrmApp")

            row = CrmApp(
                title=title_clean,
                workspace_id=workspace_id,
                created_by_clerk_user_id=user_id,
            )
            session.add(row)
            session.commit()
            session.refresh(row)
            return crm_app_to_gql(row)
