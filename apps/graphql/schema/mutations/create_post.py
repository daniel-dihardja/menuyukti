"""Create a standalone post draft in the caller's workspace."""

from __future__ import annotations

import strawberry

from graphql.context import request_session_scope
from graphql.data_sources import InstagramPost, Workspace, WorkspaceMembership
from graphql.schema.auth import user_id_from_info
from graphql.schema.queries.posts import _post_to_gql
from graphql.schema.types import PostType


def _primary_workspace_id(session, user_id: str) -> int | None:
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
    return ws.id


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
            workspace_id = _primary_workspace_id(session, user_id)
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
            session.commit()
            session.refresh(row)
            return _post_to_gql(row)
