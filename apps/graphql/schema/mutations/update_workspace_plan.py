"""Staff-facing mutation to set a workspace product plan (free | pro).

Authority is enforced by the web staff BFF (Menuyukti admin). GraphQL only requires
an authenticated caller; do not expose a customer self-upgrade UI.
"""

from __future__ import annotations

import strawberry

from graphql.context import request_session_scope
from graphql.data_sources import Workspace
from graphql.schema.auth import user_id_from_info
from graphql.schema.queries.workspace import _workspace_to_gql
from graphql.schema.types import WorkspaceType
from graphql.services.workspace_plan import normalize_workspace_plan


@strawberry.type
class UpdateWorkspacePlanMutation:
    @strawberry.mutation(
        description=(
            "Set workspace.plan to free or pro. Intended for staff BFF only; "
            "not a customer self-serve upgrade path."
        )
    )
    def update_workspace_plan(
        self,
        info: strawberry.Info,
        workspace_id: strawberry.ID,
        plan: str,
    ) -> WorkspaceType:
        user_id = user_id_from_info(info)
        if not user_id:
            raise ValueError("Missing authenticated user for updateWorkspacePlan")
        normalized = normalize_workspace_plan(plan)
        wid = int(workspace_id)
        with request_session_scope(info) as session:
            ws = session.get(Workspace, wid)
            if ws is None:
                raise ValueError("Workspace not found")
            ws.plan = normalized
            session.commit()
            session.refresh(ws)
            return _workspace_to_gql(ws)
