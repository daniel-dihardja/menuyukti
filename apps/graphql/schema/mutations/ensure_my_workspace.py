"""Self-serve idempotent workspace for the authenticated user."""

from __future__ import annotations

import strawberry

from graphql.context import request_session_scope
from graphql.schema.auth import user_id_from_info
from graphql.schema.queries.workspace import _workspace_to_gql
from graphql.schema.types import WorkspaceType
from graphql.services.ensure_workspace import ensure_workspace_for_user


@strawberry.type
class EnsureMyWorkspaceMutation:
    @strawberry.mutation(
        description=(
            "Get or create the primary workspace for the signed-in user. "
            "Creates a default owner workspace when none exists. "
            "Staff may still use provisionWorkspace for custom agency setups."
        )
    )
    def ensure_my_workspace(self, info: strawberry.Info) -> WorkspaceType:
        user_id = user_id_from_info(info)
        if not user_id:
            raise ValueError("Missing authenticated user for ensureMyWorkspace")
        with request_session_scope(info) as session:
            ws = ensure_workspace_for_user(session, user_id)
            return _workspace_to_gql(ws)
