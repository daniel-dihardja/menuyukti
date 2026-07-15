"""Update a standalone post in the caller's workspace."""

from __future__ import annotations

import strawberry
from sqlalchemy.orm import joinedload

from graphql.context import request_session_scope
from graphql.data_sources import InstagramPost, InstagramPostPage
from graphql.schema.auth import is_workspace_member, user_id_from_info
from graphql.schema.queries.posts import _post_to_gql
from graphql.schema.types import PostType


@strawberry.type
class UpdatePostMutation:
    @strawberry.mutation
    def update_post(self, info: strawberry.Info, id: strawberry.ID, title: str) -> PostType:
        user_id = user_id_from_info(info)
        if not user_id:
            raise ValueError("Missing authenticated user for updatePost")

        title_clean = title.strip()
        if not title_clean:
            raise ValueError("Post title is required")

        try:
            post_pk = int(str(id))
        except ValueError as e:
            raise ValueError("Invalid post id") from e
        if post_pk < 1:
            raise ValueError("Invalid post id")

        with request_session_scope(info) as session:
            row = (
                session.query(InstagramPost)
                .options(
                    joinedload(InstagramPost.pages).joinedload(InstagramPostPage.media_versions),
                )
                .filter(InstagramPost.id == post_pk)
                .first()
            )
            if row is None:
                raise ValueError("Post not found")

            if row.workspace_id is None:
                raise PermissionError("Not allowed to update this post")

            if not is_workspace_member(session, row.workspace_id, user_id):
                raise PermissionError("Not allowed to update this post")

            row.title = title_clean
            session.commit()
            session.refresh(row)
            return _post_to_gql(row)
