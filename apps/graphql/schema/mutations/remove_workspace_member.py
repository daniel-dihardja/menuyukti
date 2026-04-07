import strawberry

from graphql.data_sources import SessionLocal, WorkspaceMembership
from graphql.schema.auth import is_workspace_owner_role


def _user_id(info: strawberry.Info) -> str:
    ctx = info.context
    if isinstance(ctx, dict):
        return str(ctx.get("user_id") or "")
    return ""


@strawberry.type
class RemoveWorkspaceMemberMutation:
    @strawberry.mutation
    def remove_workspace_member(
        self,
        info: strawberry.Info,
        workspace_id: strawberry.ID,
        clerk_user_id: str,
    ) -> bool:
        user_id = _user_id(info)
        if not user_id:
            raise ValueError("Missing authenticated user for removeWorkspaceMember")
        wid = int(workspace_id)
        session = SessionLocal()
        try:
            if not is_workspace_owner_role(session, wid, user_id):
                raise PermissionError("Access denied")
            if clerk_user_id == user_id:
                raise ValueError("Cannot remove yourself as workspace owner")
            target = (
                session.query(WorkspaceMembership)
                .filter(
                    WorkspaceMembership.workspace_id == wid,
                    WorkspaceMembership.clerk_user_id == clerk_user_id,
                )
                .first()
            )
            if target is None:
                raise ValueError("Membership not found")
            if target.role == "owner":
                raise ValueError("Cannot remove workspace owner")
            session.delete(target)
            session.commit()
            return True
        finally:
            session.close()
