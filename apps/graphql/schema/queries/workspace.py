import strawberry

from graphql.context import request_session_scope
from graphql.data_sources import Workspace, WorkspaceMembership
from graphql.limits import DEFAULT_LIST_FIRST, MAX_LIST_FIRST, clamp_page_size
from graphql.schema.auth import is_workspace_member, user_id_from_info
from graphql.schema.types import WorkspaceMembershipType, WorkspaceType
from graphql.services.workspace_scope import primary_membership_for_user


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
        """Primary workspace for the current user (most recently accepted membership)."""
        user_id = user_id_from_info(info)
        if not user_id:
            return None
        with request_session_scope(info) as session:
            mem = primary_membership_for_user(session, user_id)
            if mem is None:
                return None
            ws = session.get(Workspace, mem.workspace_id)
            if ws is None:
                return None
            return _workspace_to_gql(ws)

    @strawberry.field
    def workspace_members(
        self,
        info: strawberry.Info,
        workspace_id: strawberry.ID,
        first: int | None = None,
    ) -> list[WorkspaceMembershipType]:
        user_id = user_id_from_info(info)
        if not user_id:
            return []
        limit = clamp_page_size(
            first,
            default=DEFAULT_LIST_FIRST,
            maximum=MAX_LIST_FIRST,
        )
        wid = int(workspace_id)
        with request_session_scope(info) as session:
            if not is_workspace_member(session, wid, user_id):
                return []
            rows = (
                session.query(WorkspaceMembership)
                .filter(WorkspaceMembership.workspace_id == wid)
                .order_by(WorkspaceMembership.id)
                .limit(limit)
                .all()
            )
            return [_membership_to_gql(r) for r in rows]
