import strawberry

from graphql.data_sources import SessionLocal, Workspace, WorkspaceMembership
from graphql.schema.auth import is_workspace_member, user_id_from_info
from graphql.schema.types import WorkspaceMembershipType, WorkspaceType


def _workspace_to_gql(row: Workspace) -> WorkspaceType:
    return WorkspaceType(
        id=str(row.id),
        name=row.name,
        owner_clerk_user_id=row.owner_clerk_user_id,
        created_at=row.created_at,
    )


def _membership_to_gql(row: WorkspaceMembership) -> WorkspaceMembershipType:
    return WorkspaceMembershipType(
        id=str(row.id),
        workspace_id=str(row.workspace_id),
        clerk_user_id=row.clerk_user_id,
        role=row.role,
        invited_at=row.invited_at,
        accepted_at=row.accepted_at,
    )


@strawberry.type
class WorkspaceQuery:
    @strawberry.field
    def my_workspace(self, info: strawberry.Info) -> WorkspaceType | None:
        """First workspace where the current user is a member (owner or member)."""
        user_id = user_id_from_info(info)
        if not user_id:
            return None
        session = SessionLocal()
        try:
            mem = (
                session.query(WorkspaceMembership)
                .filter(WorkspaceMembership.clerk_user_id == user_id)
                .order_by(WorkspaceMembership.workspace_id)
                .first()
            )
            if mem is None:
                return None
            ws = session.get(Workspace, mem.workspace_id)
            if ws is None:
                return None
            return _workspace_to_gql(ws)
        finally:
            session.close()

    @strawberry.field
    def workspace_members(
        self, info: strawberry.Info, workspace_id: strawberry.ID
    ) -> list[WorkspaceMembershipType]:
        user_id = user_id_from_info(info)
        if not user_id:
            return []
        wid = int(workspace_id)
        session = SessionLocal()
        try:
            if not is_workspace_member(session, wid, user_id):
                return []
            rows = (
                session.query(WorkspaceMembership)
                .filter(WorkspaceMembership.workspace_id == wid)
                .order_by(WorkspaceMembership.id)
                .all()
            )
            return [_membership_to_gql(r) for r in rows]
        finally:
            session.close()
