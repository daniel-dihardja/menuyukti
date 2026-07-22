"""Update a workflow-scoped Instagram item."""

from __future__ import annotations

from datetime import datetime

import strawberry
from strawberry import UNSET

from graphql.context import request_session_scope
from graphql.data_sources import InstagramItemMediaVersion
from graphql.schema.auth import user_id_from_info
from graphql.schema.instagram_items_common import (
    item_to_gql,
    load_item_for_owner,
    normalize_kind,
    normalize_optional_text,
    normalize_reference_images,
    normalize_status,
    parse_positive_id,
    reload_item_with_versions,
    resolve_style_id_for_user,
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
        style_id: int | None = UNSET,
        status: str | None = None,
        schedule: datetime | None = UNSET,
    ) -> InstagramItemType:
        """Patch provided fields. Empty strings clear nullable text fields.

        ``schedule``, ``media_s3_key``, ``generation_prompt``, ``reference_images``,
        and ``style_id`` use UNSET so omit leaves unchanged; explicit null / empty
        list clears.

        Setting ``media_s3_key`` to a new key appends a media version and commits it.
        Setting it to an existing version key reselects (commits) without duplicating.
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
                        if key_clean != row.media_s3_key:
                            row.media_s3_key = key_clean
                            existing_version = next(
                                (
                                    version
                                    for version in row.media_versions
                                    if version.media_s3_key == key_clean
                                ),
                                None,
                            )
                            if existing_version is None:
                                if generation_prompt is not UNSET:
                                    if generation_prompt is None:
                                        version_prompt = None
                                    else:
                                        version_prompt = normalize_optional_text(generation_prompt)
                                else:
                                    version_prompt = row.generation_prompt

                                row.media_versions.append(
                                    InstagramItemMediaVersion(
                                        media_s3_key=key_clean,
                                        prompt=version_prompt,
                                    )
                                )

            if generation_prompt is not UNSET:
                if generation_prompt is None:
                    row.generation_prompt = None
                else:
                    row.generation_prompt = normalize_optional_text(generation_prompt)
            if reference_images is not UNSET:
                row.reference_images = normalize_reference_images(reference_images)
            if style_id is not UNSET:
                if style_id is None:
                    row.style_id = None
                else:
                    row.style_id = resolve_style_id_for_user(session, int(style_id), user_id)
            if status is not None:
                row.status = normalize_status(status)
            if schedule is not UNSET:
                row.schedule = schedule

            session.add(row)
            session.commit()
            return item_to_gql(reload_item_with_versions(session, item_pk))
