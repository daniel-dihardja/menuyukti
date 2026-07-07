"""Delete a standalone post in the caller's workspace."""

from __future__ import annotations

import strawberry

from graphql.context import request_session_scope
from graphql.data_sources import InstagramPost
from graphql.schema.auth import is_workspace_member, user_id_from_info


@strawberry.type
class DeletePostMutation:
    @strawberry.mutation
    def delete_post(self, info: strawberry.Info, id: strawberry.ID) -> bool:
        user_id = user_id_from_info(info)
        if not user_id:
            raise ValueError("Missing authenticated user for deletePost")

        try:
            post_pk = int(str(id))
        except ValueError as e:
            raise ValueError("Invalid post id") from e
        if post_pk < 1:
            raise ValueError("Invalid post id")

        with request_session_scope(info) as session:
            row = session.get(InstagramPost, post_pk)
            if row is None:
                raise ValueError("Post not found")

            if row.workspace_id is None:
                raise PermissionError("Not allowed to delete this post")

            if not is_workspace_member(session, row.workspace_id, user_id):
                raise PermissionError("Not allowed to delete this post")

            session.delete(row)
            session.commit()
            return True
