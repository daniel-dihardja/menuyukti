"""Update media and prompt on an Instagram item page."""

from __future__ import annotations

from datetime import UTC, datetime

import strawberry
from strawberry import UNSET

from graphql.context import request_session_scope
from graphql.data_sources import InstagramItemPageMediaVersion
from graphql.schema.auth import user_id_from_info
from graphql.schema.instagram_items_common import (
    item_workspace_media_scope,
    load_item_for_owner,
    load_page_for_owner,
    normalize_optional_text,
    page_to_gql,
    parse_positive_id,
    reload_page_with_versions,
    validate_item_media_s3_key,
)
from graphql.schema.types.instagram_item import InstagramItemPageType


@strawberry.type
class UpdateInstagramItemPageMutation:
    @strawberry.mutation
    def update_instagram_item_page(
        self,
        info: strawberry.Info,
        id: strawberry.ID,
        media_s3_key: str | None = UNSET,
        prompt: str | None = UNSET,
    ) -> InstagramItemPageType:
        """Patch page media/prompt.

        Setting ``media_s3_key`` to a new key appends a media version and commits it.
        Setting it to an existing version key reselects (commits) without duplicating.
        """
        user_id = user_id_from_info(info)
        if not user_id:
            raise ValueError("Missing authenticated user for updateInstagramItemPage")

        page_pk = parse_positive_id(id, label="instagram item page id")

        with request_session_scope(info) as session:
            page_row = load_page_for_owner(session, page_pk, user_id)
            item_row = load_item_for_owner(session, page_row.instagram_item_id, user_id)

            if media_s3_key is not UNSET:
                if media_s3_key is None:
                    page_row.media_s3_key = None
                else:
                    key_clean = media_s3_key.strip()
                    if key_clean == "":
                        page_row.media_s3_key = None
                    else:
                        workspace_id, owner_id = item_workspace_media_scope(session, item_row)
                        validate_item_media_s3_key(
                            key_clean,
                            workspace_id=workspace_id,
                            owner_clerk_user_id=owner_id,
                        )
                        if key_clean != page_row.media_s3_key:
                            page_row.media_s3_key = key_clean
                            existing_version = next(
                                (
                                    version
                                    for version in page_row.media_versions
                                    if version.media_s3_key == key_clean
                                ),
                                None,
                            )
                            if existing_version is None:
                                if prompt is not UNSET:
                                    version_prompt = (
                                        None
                                        if prompt is None
                                        else normalize_optional_text(prompt)
                                    )
                                else:
                                    version_prompt = page_row.prompt

                                session.add(
                                    InstagramItemPageMediaVersion(
                                        instagram_item_page_id=page_row.id,
                                        media_s3_key=key_clean,
                                        prompt=version_prompt,
                                    )
                                )

            if prompt is not UNSET:
                page_row.prompt = None if prompt is None else normalize_optional_text(prompt)

            item_row.updated_at = datetime.now(tz=UTC)
            session.add(page_row)
            session.add(item_row)
            session.commit()
            return page_to_gql(reload_page_with_versions(session, page_pk))
