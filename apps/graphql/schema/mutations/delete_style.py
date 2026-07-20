"""Delete a workspace visual style pack."""

from __future__ import annotations

import strawberry

from graphql.context import request_session_scope
from graphql.data_sources.models.visual_style import VisualStyle
from graphql.schema.auth import is_workspace_member, user_id_from_info


@strawberry.type
class DeleteStyleMutation:
    @strawberry.mutation(description="Delete a visual style pack by id.")
    def delete_style(self, info: strawberry.Info, id: int) -> bool:
        user_id = user_id_from_info(info)
        if not user_id:
            raise ValueError("Missing authenticated user for deleteStyle")

        with request_session_scope(info) as session:
            row = session.query(VisualStyle).filter(VisualStyle.id == id).first()
            if row is None:
                raise ValueError("Style not found")
            if not is_workspace_member(session, row.workspace_id, user_id):
                raise PermissionError("Not allowed to delete this style")
            session.delete(row)
            session.commit()
            return True
