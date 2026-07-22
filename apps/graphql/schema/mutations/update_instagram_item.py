"""Update a workflow-scoped Instagram item."""

from __future__ import annotations

from datetime import datetime

import strawberry
from strawberry import UNSET

from graphql.context import request_session_scope
from graphql.schema.auth import user_id_from_info
from graphql.schema.instagram_items_common import (
    item_to_gql,
    load_item_for_owner,
    normalize_kind,
    normalize_optional_text,
    normalize_reference_images,
    normalize_status,
    parse_positive_id,
    validate_item_media_s3_key,
)
from graphql.schema.types.instagram_item import (
    InstagramItemReferenceImageInput,
    InstagramItemType,
)


@strawberry.type
class UpdateInstagramItemMutation:
    @strawberry.mutation
    def update_instagram_item(
        self,
        info: strawberry.Info,
        id: strawberry.ID,
        kind: str | None = None,
        title: str | None = None,
        caption: str | None = None,
        hook: str | None = None,
        visual_brief: str | None = None,
        media_s3_key: str | None = UNSET,
        generation_prompt: str | None = UNSET,
        reference_images: list[InstagramItemReferenceImageInput] | None = UNSET,
        status: str | None = None,
        schedule: datetime | None = UNSET,
    ) -> InstagramItemType:
        """Patch provided fields. Empty strings clear nullable text fields.

        ``schedule``, ``media_s3_key``, ``generation_prompt``, and ``reference_images``
        use UNSET so omit leaves unchanged; explicit null / empty list clears.
        """
        user_id = user_id_from_info(info)
        if not user_id:
            raise ValueError("Missing authenticated user for updateInstagramItem")

        item_pk = parse_positive_id(id, label="instagram item id")

        with request_session_scope(info) as session:
            row = load_item_for_owner(session, item_pk, user_id)

            if kind is not None:
                row.kind = normalize_kind(kind)
            if title is not None:
                row.title = normalize_optional_text(title, max_len=256)
            if caption is not None:
                row.caption = normalize_optional_text(caption)
            if hook is not None:
                row.hook = normalize_optional_text(hook)
            if visual_brief is not None:
                row.visual_brief = normalize_optional_text(visual_brief)
            if media_s3_key is not UNSET:
                if media_s3_key is None:
                    row.media_s3_key = None
                else:
                    key_clean = media_s3_key.strip()
                    if key_clean == "":
                        row.media_s3_key = None
                    else:
                        validate_item_media_s3_key(key_clean, user_id)
                        row.media_s3_key = key_clean
            if generation_prompt is not UNSET:
                if generation_prompt is None:
                    row.generation_prompt = None
                else:
                    row.generation_prompt = normalize_optional_text(generation_prompt)
            if reference_images is not UNSET:
                row.reference_images = normalize_reference_images(reference_images)
            if status is not None:
                row.status = normalize_status(status)
            if schedule is not UNSET:
                row.schedule = schedule

            session.commit()
            session.refresh(row)
            return item_to_gql(row)
