import strawberry

from graphql.context import request_session_scope
from graphql.limits import DEFAULT_LIST_FIRST, MAX_LIST_FIRST, clamp_page_size
from graphql.schema.auth import user_id_from_info
from graphql.schema.mappers.post import post_to_gql
from graphql.schema.types import PostType
from graphql.services.posts import list_posts_for_user, load_post_for_user


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
            rows = list_posts_for_user(session, user_id, limit=limit)
            return [post_to_gql(row) for row in rows]

    @strawberry.field(description="A single post in the caller's workspace, with pages.")
    def post(self, info: strawberry.Info, id: strawberry.ID) -> PostType | None:
        user_id = user_id_from_info(info)
        if not user_id:
            return None

        try:
            post_pk = int(str(id))
        except ValueError:
            return None
        if post_pk < 1:
            return None

        with request_session_scope(info) as session:
            row = load_post_for_user(session, post_pk, user_id)
            if row is None:
                return None
            return post_to_gql(row)
