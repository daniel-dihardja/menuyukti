"""Named createWorkspace is disabled; self-serve use ensureMyWorkspace."""

from __future__ import annotations

import strawberry

from graphql.schema.auth import user_id_from_info
from graphql.schema.types import WorkspaceType


@strawberry.type
class CreateWorkspaceMutation:
    @strawberry.mutation(
        description=(
            "Disabled. Use ensureMyWorkspace for self-serve default workspaces, "
            "or provisionWorkspace via the Menuyukti admin BFF for custom setups."
        )
    )
    def create_workspace(self, info: strawberry.Info, name: str) -> WorkspaceType:
        user_id = user_id_from_info(info)
        if not user_id:
            raise ValueError("Missing authenticated user for createWorkspace")
        raise PermissionError(
            "Self-serve workspace creation via createWorkspace is disabled. "
            "Use ensureMyWorkspace or staff provisionWorkspace."
        )
