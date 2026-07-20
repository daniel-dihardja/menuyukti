import strawberry
from sqlalchemy.orm import joinedload

from graphql.context import request_session_scope
from graphql.data_sources import InstagramPost, InstagramPostPage
from graphql.limits import DEFAULT_LIST_FIRST, MAX_LIST_FIRST, clamp_page_size
from graphql.schema.auth import is_workspace_member, user_id_from_info
from graphql.schema.types import PostPageMediaVersionType, PostPageType, PostType
from graphql.services.workspace_scope import workspace_ids_for_user


def _media_version_to_gql(row) -> PostPageMediaVersionType:
    return PostPageMediaVersionType(
        id=strawberry.ID(str(row.id)),
        media_s3_key=row.media_s3_key,
        prompt=row.prompt,
        created_at=row.created_at,
    )


def _post_page_to_gql(row) -> PostPageType:
    versions = list(row.media_versions) if row.media_versions else []
    versions.sort(key=lambda version: (version.created_at, version.id), reverse=True)
    return PostPageType(
        id=strawberry.ID(str(row.id)),
        sort_order=row.sort_order,
        media_s3_key=row.media_s3_key,
        prompt=row.prompt,
        image_format=row.image_format,
        image_quality=row.image_quality,
        generation_model=row.generation_model,
        media_versions=[_media_version_to_gql(version) for version in versions],
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


def _post_to_gql(row: InstagramPost) -> PostType:
    pages = sorted(row.pages, key=lambda p: p.sort_order) if row.pages else []
    return PostType(
        id=strawberry.ID(str(row.id)),
        title=row.title,
        status=row.status,
        caption=row.caption,
        media_type=row.media_type,
        location_id=row.location_id,
        workspace_id=strawberry.ID(str(row.workspace_id)) if row.workspace_id is not None else None,
        pages=[_post_page_to_gql(page) for page in pages],
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


def _load_post_for_user(session, post_pk: int, user_id: str) -> InstagramPost | None:
    row = (
        session.query(InstagramPost)
        .options(
            joinedload(InstagramPost.pages).joinedload(InstagramPostPage.media_versions),
        )
        .filter(InstagramPost.id == post_pk)
        .first()
    )
    if row is None:
        return None
    if row.workspace_id is None:
        return None
    if not is_workspace_member(session, row.workspace_id, user_id):
        return None
    return row


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
            workspace_ids = workspace_ids_for_user(session, user_id)
            if not workspace_ids:
                return []
            rows = (
                session.query(InstagramPost)
                .options(
                    joinedload(InstagramPost.pages).joinedload(InstagramPostPage.media_versions),
                )
                .filter(InstagramPost.workspace_id.in_(workspace_ids))
                .order_by(InstagramPost.updated_at.desc(), InstagramPost.id.desc())
                .limit(limit)
                .all()
            )
            return [_post_to_gql(row) for row in rows]

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
            row = _load_post_for_user(session, post_pk, user_id)
            if row is None:
                return None
            return _post_to_gql(row)
