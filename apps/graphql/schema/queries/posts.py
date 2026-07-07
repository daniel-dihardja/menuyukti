import strawberry

from graphql.context import request_session_scope
from graphql.data_sources import InstagramPost, WorkspaceMembership
from graphql.limits import DEFAULT_LIST_FIRST, MAX_LIST_FIRST, clamp_page_size
from graphql.schema.auth import user_id_from_info
from graphql.schema.types import PostType


def _post_to_gql(row: InstagramPost) -> PostType:
    return PostType(
        id=strawberry.ID(str(row.id)),
        title=row.title,
        status=row.status,
        caption=row.caption,
        media_type=row.media_type,
        location_id=row.location_id,
        workspace_id=strawberry.ID(str(row.workspace_id)) if row.workspace_id is not None else None,
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


def _workspace_ids_for_user(session, user_id: str) -> list[int]:
    return [
        w[0]
        for w in session.query(WorkspaceMembership.workspace_id)
        .filter(WorkspaceMembership.clerk_user_id == user_id)
        .all()
    ]


@strawberry.type
class PostsQuery:
    @strawberry.field(description="Posts in workspaces the current user belongs to, newest first.")
    def posts(self, info: strawberry.Info, first: int | None = None) -> list[PostType]:
        user_id = user_id_from_info(info)
        if not user_id:
            return []
        limit = clamp_page_size(
            first,
            default=DEFAULT_LIST_FIRST,
            maximum=MAX_LIST_FIRST,
        )
        with request_session_scope(info) as session:
            workspace_ids = _workspace_ids_for_user(session, user_id)
            if not workspace_ids:
                return []
            rows = (
                session.query(InstagramPost)
                .filter(InstagramPost.workspace_id.in_(workspace_ids))
                .order_by(InstagramPost.updated_at.desc(), InstagramPost.id.desc())
                .limit(limit)
                .all()
            )
            return [_post_to_gql(row) for row in rows]
