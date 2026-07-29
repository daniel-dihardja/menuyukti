"""Delete a generated image version from an Instagram item page."""

from __future__ import annotations

from datetime import UTC, datetime

import strawberry

from graphql.context import request_session_scope
from graphql.data_sources import InstagramItemPageMediaVersion
from graphql.schema.auth import user_id_from_info
from graphql.schema.instagram_items_common import (
    item_workspace_media_scope,
    load_item_for_owner,
    load_page_for_owner,
    page_to_gql,
    parse_positive_id,
    reload_page_with_versions,
    validate_item_media_s3_key,
)
from graphql.schema.types.instagram_item import InstagramItemPageType


def _newest_remaining_media_s3_key(
    versions: list[InstagramItemPageMediaVersion],
) -> str | None:
    if not versions:
        return None
    newest = max(versions, key=lambda version: (version.created_at, version.id))
    return newest.media_s3_key


@strawberry.type
class DeleteInstagramItemPageMediaVersionMutation:
    @strawberry.mutation
    def delete_instagram_item_page_media_version(
        self,
        info: strawberry.Info,
        page_id: strawberry.ID,
        media_s3_key: str,
    ) -> InstagramItemPageType:
        user_id = user_id_from_info(info)
        if not user_id:
            raise ValueError("Missing authenticated user for deleteInstagramItemPageMediaVersion")

        page_pk = parse_positive_id(page_id, label="instagram item page id")

        key_clean = media_s3_key.strip()
        if key_clean == "":
            raise ValueError("media_s3_key is required")

        with request_session_scope(info) as session:
            page_row = load_page_for_owner(session, page_pk, user_id)
            item_row = load_item_for_owner(session, page_row.instagram_item_id, user_id)
            workspace_id, owner_id = item_workspace_media_scope(session, item_row)
            validate_item_media_s3_key(
                key_clean,
                workspace_id=workspace_id,
                owner_clerk_user_id=owner_id,
            )

            version_row = next(
                (
                    version
                    for version in page_row.media_versions
                    if version.media_s3_key == key_clean
                ),
                None,
            )
            if version_row is None:
                raise ValueError("Media version not found for this Instagram item page")

            session.delete(version_row)
            remaining = [
                version for version in page_row.media_versions if version.id != version_row.id
            ]
            page_row.media_versions = remaining

            if page_row.media_s3_key == key_clean:
                page_row.media_s3_key = _newest_remaining_media_s3_key(remaining)

            item_row.updated_at = datetime.now(tz=UTC)
            session.add(page_row)
            session.add(item_row)
            session.commit()
            return page_to_gql(reload_page_with_versions(session, page_pk))
