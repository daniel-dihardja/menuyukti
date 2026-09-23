"""Self-serve createWorkspace is disabled; use provisionWorkspace via staff BFF."""

from __future__ import annotations

import strawberry

from graphql.schema.auth import user_id_from_info
from graphql.schema.types import WorkspaceType


@strawberry.type
class CreateWorkspaceMutation:
    @strawberry.mutation(
        description=(
            "Disabled for self-serve. Workspaces are staff-provisioned via "
            "provisionWorkspace (Menuyukti admin BFF)."
        )
    )
    def create_workspace(self, info: strawberry.Info, name: str) -> WorkspaceType:
        user_id = user_id_from_info(info)
        if not user_id:
            raise ValueError("Missing authenticated user for createWorkspace")
        raise PermissionError(
            "Self-serve workspace creation is disabled. "
            "Workspaces are staff-provisioned only."
        )
