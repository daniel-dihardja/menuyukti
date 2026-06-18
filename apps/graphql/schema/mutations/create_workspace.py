from datetime import UTC, datetime

import strawberry

from graphql.context import request_session_scope
from graphql.data_sources import Workspace, WorkspaceMembership
from graphql.schema.auth import user_id_from_info
from graphql.schema.types import WorkspaceType


@strawberry.type
class CreateWorkspaceMutation:
    @strawberry.mutation
    def create_workspace(self, info: strawberry.Info, name: str) -> WorkspaceType:
        user_id = user_id_from_info(info)
        if not user_id:
            raise ValueError("Missing authenticated user for createWorkspace")
        now = datetime.now(tz=UTC)
        with request_session_scope(info) as session:
            ws = Workspace(name=name, owner_clerk_user_id=user_id)
            session.add(ws)
            session.flush()
            session.add(
                WorkspaceMembership(
                    workspace_id=ws.id,
                    clerk_user_id=user_id,
                    role="owner",
                    invited_at=now,
                    accepted_at=now,
                )
            )
            session.commit()
            session.refresh(ws)
            return WorkspaceType(
                id=str(ws.id),
                name=ws.name,
                owner_clerk_user_id=ws.owner_clerk_user_id,
                created_at=ws.created_at,
            )
