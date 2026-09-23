"""Staff-facing mutation to create a workspace for an operator (Clerk user).

Authority is enforced by the web staff BFF (Menuyukti admin). GraphQL only requires
an authenticated caller; do not expose a customer self-serve create path.
"""

from __future__ import annotations

from datetime import UTC, datetime

import strawberry

from graphql.context import request_session_scope
from graphql.data_sources import Workspace, WorkspaceMembership
from graphql.schema.auth import user_id_from_info
from graphql.schema.queries.workspace import _workspace_to_gql
from graphql.schema.types import WorkspaceType
from graphql.services.workspace_plan import WORKSPACE_PLAN_PRO, normalize_workspace_plan


@strawberry.type
class ProvisionWorkspaceMutation:
    @strawberry.mutation(
        description=(
            "Create a workspace owned by the given Clerk user with the given plan. "
            "Intended for staff BFF only; not a customer self-serve path. "
            "Defaults to pro (agency-provisioned restaurant clients)."
        )
    )
    def provision_workspace(
        self,
        info: strawberry.Info,
        owner_clerk_user_id: str,
        name: str,
        plan: str | None = None,
    ) -> WorkspaceType:
        user_id = user_id_from_info(info)
        if not user_id:
            raise ValueError("Missing authenticated user for provisionWorkspace")
        owner_id = (owner_clerk_user_id or "").strip()
        if not owner_id:
            raise ValueError("ownerClerkUserId is required")
        trimmed_name = (name or "").strip()
        if not trimmed_name:
            raise ValueError("name is required")
        normalized = normalize_workspace_plan(plan if plan is not None else WORKSPACE_PLAN_PRO)
        now = datetime.now(tz=UTC)
        with request_session_scope(info) as session:
            ws = Workspace(
                name=trimmed_name,
                owner_clerk_user_id=owner_id,
                plan=normalized,
            )
            session.add(ws)
            session.flush()
            session.add(
                WorkspaceMembership(
                    workspace_id=ws.id,
                    clerk_user_id=owner_id,
                    role="owner",
                    invited_at=now,
                    accepted_at=now,
                )
            )
            session.commit()
            session.refresh(ws)
            return _workspace_to_gql(ws)
