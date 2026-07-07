"""Delete a generated image version from a post page."""

from __future__ import annotations

from datetime import UTC, datetime

import strawberry
from sqlalchemy.orm import joinedload

from graphql.context import request_session_scope
from graphql.data_sources import InstagramPostPage, InstagramPostPageMediaVersion
from graphql.schema.auth import user_id_from_info
from graphql.schema.mutations.update_post_page import _validate_media_s3_key
from graphql.schema.queries.posts import _load_post_for_user, _post_page_to_gql
from graphql.schema.types import PostPageType


def _newest_remaining_media_s3_key(
    versions: list[InstagramPostPageMediaVersion],
) -> str | None:
    if not versions:
        return None
    newest = max(versions, key=lambda version: (version.created_at, version.id))
    return newest.media_s3_key


@strawberry.type
class DeletePostPageMediaVersionMutation:
    @strawberry.mutation
    def delete_post_page_media_version(
        self,
        info: strawberry.Info,
        page_id: strawberry.ID,
        media_s3_key: str,
    ) -> PostPageType:
        user_id = user_id_from_info(info)
        if not user_id:
            raise ValueError("Missing authenticated user for deletePostPageMediaVersion")

        try:
            page_pk = int(str(page_id))
        except ValueError as e:
            raise ValueError("Invalid post page id") from e
        if page_pk < 1:
            raise ValueError("Invalid post page id")

        key_clean = media_s3_key.strip()
        if key_clean == "":
            raise ValueError("media_s3_key is required")

        with request_session_scope(info) as session:
            page_row = session.get(
                InstagramPostPage,
                page_pk,
                options=[joinedload(InstagramPostPage.media_versions)],
            )
            if page_row is None:
                raise ValueError("Post page not found")

            post_row = _load_post_for_user(session, page_row.post_id, user_id)
            if post_row is None:
                raise PermissionError("Not allowed to delete this post page media version")

            owner_id = post_row.created_by_clerk_user_id
            if owner_id is None:
                raise PermissionError("Not allowed to delete this post page media version")

            _validate_media_s3_key(key_clean, owner_id)

            version_row = next(
                (version for version in page_row.media_versions if version.media_s3_key == key_clean),
                None,
            )
            if version_row is None:
                raise ValueError("Media version not found for this page")

            session.delete(version_row)
            page_row.media_versions = [
                version for version in page_row.media_versions if version.id != version_row.id
            ]

            if page_row.media_s3_key == key_clean:
                page_row.media_s3_key = _newest_remaining_media_s3_key(page_row.media_versions)

            post_row.updated_at = datetime.now(tz=UTC)
            session.add(page_row)
            session.commit()

            page_row = session.get(
                InstagramPostPage,
                page_pk,
                options=[joinedload(InstagramPostPage.media_versions)],
            )
            if page_row is None:
                raise ValueError("Post page not found")
            return _post_page_to_gql(page_row)
