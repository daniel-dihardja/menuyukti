import strawberry

from graphql.context import request_session_scope
from graphql.data_sources import WorkspaceMembership
from graphql.schema.auth import user_can_manage_workspace_members, user_id_from_info


@strawberry.type
class RemoveWorkspaceMemberMutation:
    @strawberry.mutation
    def remove_workspace_member(
        self,
        info: strawberry.Info,
        workspace_id: strawberry.ID,
        clerk_user_id: str,
    ) -> bool:
        user_id = user_id_from_info(info)
        if not user_id:
            raise ValueError("Missing authenticated user for removeWorkspaceMember")
        wid = int(workspace_id)
        with request_session_scope(info) as session:
            if not user_can_manage_workspace_members(session, wid, user_id):
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
