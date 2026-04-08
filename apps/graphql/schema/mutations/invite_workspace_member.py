from datetime import UTC, datetime

import strawberry

from graphql.data_sources import SessionLocal, WorkspaceMembership
from graphql.schema.auth import is_workspace_member, user_id_from_info
from graphql.schema.types import WorkspaceMembershipType


@strawberry.type
class InviteWorkspaceMemberMutation:
    @strawberry.mutation
    def invite_workspace_member(
        self,
        info: strawberry.Info,
        workspace_id: strawberry.ID,
        clerk_user_id: str,
    ) -> WorkspaceMembershipType:
        user_id = user_id_from_info(info)
        if not user_id:
            raise ValueError("Missing authenticated user for inviteWorkspaceMember")
        wid = int(workspace_id)
        session = SessionLocal()
        try:
            if not is_workspace_member(session, wid, user_id):
                raise PermissionError("Access denied")
            existing = (
                session.query(WorkspaceMembership)
                .filter(
                    WorkspaceMembership.workspace_id == wid,
                    WorkspaceMembership.clerk_user_id == clerk_user_id,
                )
                .first()
            )
            if existing is not None:
                raise ValueError("User is already a member of this workspace")
            now = datetime.now(tz=UTC)
            row = WorkspaceMembership(
                workspace_id=wid,
                clerk_user_id=clerk_user_id,
                role="member",
                invited_at=now,
                accepted_at=None,
            )
            session.add(row)
            session.commit()
            session.refresh(row)
            return WorkspaceMembershipType(
                id=str(row.id),
                workspace_id=str(row.workspace_id),
                clerk_user_id=row.clerk_user_id,
                role=row.role,
                invited_at=row.invited_at,
                accepted_at=row.accepted_at,
            )
        finally:
            session.close()
