"""Delete a generated image version from an Instagram item."""

from __future__ import annotations

import strawberry

from graphql.context import request_session_scope
from graphql.data_sources import InstagramItemMediaVersion
from graphql.schema.auth import user_id_from_info
from graphql.schema.instagram_items_common import (
    item_to_gql,
    load_item_for_owner,
    parse_positive_id,
    reload_item_with_versions,
    validate_item_media_s3_key,
)
from graphql.schema.types.instagram_item import InstagramItemType


def _newest_remaining_media_s3_key(
    versions: list[InstagramItemMediaVersion],
) -> str | None:
    if not versions:
        return None
    newest = max(versions, key=lambda version: (version.created_at, version.id))
    return newest.media_s3_key


@strawberry.type
class DeleteInstagramItemMediaVersionMutation:
    @strawberry.mutation
    def delete_instagram_item_media_version(
        self,
        info: strawberry.Info,
        item_id: strawberry.ID,
        media_s3_key: str,
    ) -> InstagramItemType:
        user_id = user_id_from_info(info)
        if not user_id:
            raise ValueError("Missing authenticated user for deleteInstagramItemMediaVersion")

        item_pk = parse_positive_id(item_id, label="instagram item id")

        key_clean = media_s3_key.strip()
        if key_clean == "":
            raise ValueError("media_s3_key is required")

        with request_session_scope(info) as session:
            row = load_item_for_owner(session, item_pk, user_id)
            validate_item_media_s3_key(key_clean, user_id)

            version_row = next(
                (
                    version
                    for version in row.media_versions
                    if version.media_s3_key == key_clean
                ),
                None,
            )
            if version_row is None:
                raise ValueError("Media version not found for this Instagram item")

            session.delete(version_row)
            remaining = [version for version in row.media_versions if version.id != version_row.id]
            row.media_versions = remaining

            if row.media_s3_key == key_clean:
                row.media_s3_key = _newest_remaining_media_s3_key(remaining)

            session.add(row)
            session.commit()
            return item_to_gql(reload_item_with_versions(session, item_pk))
