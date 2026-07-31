"""Create a standalone post draft in the caller's workspace."""

from __future__ import annotations

import strawberry
from sqlalchemy.orm import joinedload

from graphql.context import request_session_scope
from graphql.data_sources import InstagramPost, InstagramPostPage
from graphql.schema.auth import user_id_from_info
from graphql.schema.mappers.post import post_to_gql
from graphql.schema.types import PostType
from graphql.services.workspace_scope import primary_workspace_id


@strawberry.type
class CreatePostMutation:
    @strawberry.mutation
    def create_post(self, info: strawberry.Info, title: str | None = None) -> PostType:
        user_id = user_id_from_info(info)
        if not user_id:
            raise ValueError("Missing authenticated user for createPost")

        title_clean = title.strip() if title else None
        if title_clean == "":
            title_clean = None

        with request_session_scope(info) as session:
            workspace_id = primary_workspace_id(session, user_id)
            if workspace_id is None:
                raise ValueError("No workspace found for createPost")

            row = InstagramPost(
                workspace_id=workspace_id,
                location_id=None,
                title=title_clean,
                status="draft",
                created_by_clerk_user_id=user_id,
            )
            session.add(row)
            session.flush()
            session.add(InstagramPostPage(post_id=row.id, sort_order=0))
            session.commit()
            loaded = (
                session.query(InstagramPost)
                .options(joinedload(InstagramPost.pages))
                .filter(InstagramPost.id == row.id)
                .first()
            )
            if loaded is None:
                raise ValueError("Failed to load created post")
            return post_to_gql(loaded)
