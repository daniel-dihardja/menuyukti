from datetime import UTC, datetime

import strawberry

from graphql.data_sources import SessionLocal, Workspace, WorkspaceMembership
from graphql.schema.types import WorkspaceType


def _user_id(info: strawberry.Info) -> str:
    ctx = info.context
    if isinstance(ctx, dict):
        return str(ctx.get("user_id") or "")
    return ""


@strawberry.type
class CreateWorkspaceMutation:
    @strawberry.mutation
    def create_workspace(self, info: strawberry.Info, name: str) -> WorkspaceType:
        user_id = _user_id(info)
        if not user_id:
            raise ValueError("Missing authenticated user for createWorkspace")
        now = datetime.now(tz=UTC)
        session = SessionLocal()
        try:
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
        finally:
            session.close()
