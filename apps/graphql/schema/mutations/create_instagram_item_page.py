"""Create a new page/frame within a workflow Instagram item."""

from __future__ import annotations

from datetime import UTC, datetime

import strawberry
from strawberry import UNSET

from graphql.context import request_session_scope
from graphql.data_sources import InstagramItemPage, InstagramItemPageMediaVersion
from graphql.schema.auth import user_id_from_info
from graphql.schema.instagram_items_common import (
    MAX_INSTAGRAM_ITEM_PAGES,
    load_item_for_owner,
    normalize_optional_text,
    page_to_gql,
    parse_positive_id,
    reload_page_with_versions,
    validate_item_media_s3_key,
)
from graphql.schema.types.instagram_item import InstagramItemPageType


@strawberry.type
class CreateInstagramItemPageMutation:
    @strawberry.mutation
    def create_instagram_item_page(
        self,
        info: strawberry.Info,
        item_id: strawberry.ID,
        media_s3_key: str | None = UNSET,
        prompt: str | None = UNSET,
    ) -> InstagramItemPageType:
        user_id = user_id_from_info(info)
        if not user_id:
            raise ValueError("Missing authenticated user for createInstagramItemPage")

        item_pk = parse_positive_id(item_id, label="instagram item id")

        with request_session_scope(info) as session:
            item_row = load_item_for_owner(session, item_pk, user_id)
            existing_pages = list(item_row.pages) if item_row.pages else []
            if len(existing_pages) >= MAX_INSTAGRAM_ITEM_PAGES:
                raise ValueError("Instagram item has reached the maximum number of pages")

            next_sort_order = (
                max(page.sort_order for page in existing_pages) + 1 if existing_pages else 0
            )

            page_row = InstagramItemPage(
                instagram_item_id=item_row.id,
                sort_order=next_sort_order,
            )
            session.add(page_row)
            session.flush()

            if media_s3_key is not UNSET and media_s3_key is not None:
                key_clean = media_s3_key.strip()
                if key_clean != "":
                    validate_item_media_s3_key(key_clean, user_id)
                    page_row.media_s3_key = key_clean

                    if prompt is not UNSET:
                        version_prompt = (
                            None if prompt is None else normalize_optional_text(prompt)
                        )
                    else:
                        version_prompt = None

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
            session.add(item_row)
            session.commit()
            return page_to_gql(reload_page_with_versions(session, page_row.id))
