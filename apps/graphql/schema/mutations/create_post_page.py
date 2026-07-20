"""Create a new page/slide within an Instagram post."""

from __future__ import annotations

from datetime import UTC, datetime

import strawberry
from sqlalchemy.orm import joinedload
from strawberry import UNSET

from graphql.context import request_session_scope
from graphql.data_sources import InstagramPostPage, InstagramPostPageMediaVersion
from graphql.schema.auth import user_id_from_info
from graphql.schema.mutations.update_post_page import (
    _ALLOWED_GENERATION_MODELS,
    _ALLOWED_IMAGE_FORMATS,
    _ALLOWED_IMAGE_QUALITIES,
    _normalize_optional_setting,
    _validate_media_s3_key,
)
from graphql.schema.queries.posts import _load_post_for_user, _post_page_to_gql
from graphql.schema.types import PostPageType

MAX_POST_PAGES = 10


@strawberry.type
class CreatePostPageMutation:
    @strawberry.mutation
    def create_post_page(
        self,
        info: strawberry.Info,
        post_id: strawberry.ID,
        media_s3_key: str | None = UNSET,
        prompt: str | None = UNSET,
        image_format: str | None = UNSET,
        image_quality: str | None = UNSET,
        generation_model: str | None = UNSET,
    ) -> PostPageType:
        user_id = user_id_from_info(info)
        if not user_id:
            raise ValueError("Missing authenticated user for createPostPage")

        try:
            post_pk = int(str(post_id))
        except ValueError as e:
            raise ValueError("Invalid post id") from e
        if post_pk < 1:
            raise ValueError("Invalid post id")

        with request_session_scope(info) as session:
            post_row = _load_post_for_user(session, post_pk, user_id)
            if post_row is None:
                raise PermissionError("Not allowed to create a page for this post")

            owner_id = post_row.created_by_clerk_user_id
            if owner_id is None:
                raise PermissionError("Not allowed to create a page for this post")

            existing_pages = list(post_row.pages) if post_row.pages else []
            if len(existing_pages) >= MAX_POST_PAGES:
                raise ValueError("Post has reached the maximum number of pages")

            next_sort_order = (
                max(page.sort_order for page in existing_pages) + 1 if existing_pages else 0
            )

            page_row = InstagramPostPage(post_id=post_row.id, sort_order=next_sort_order)
            session.add(page_row)
            session.flush()

            if media_s3_key is not UNSET and media_s3_key is not None:
                key_clean = media_s3_key.strip()
                if key_clean != "":
                    _validate_media_s3_key(key_clean, owner_id)
                    page_row.media_s3_key = key_clean

                    version_prompt: str | None
                    if prompt is not UNSET:
                        if prompt is None:
                            version_prompt = None
                        else:
                            prompt_clean = prompt.strip()
                            version_prompt = prompt_clean if prompt_clean else None
                    else:
                        version_prompt = None

                    session.add(
                        InstagramPostPageMediaVersion(
                            post_page_id=page_row.id,
                            media_s3_key=key_clean,
                            prompt=version_prompt,
                        )
                    )

            if prompt is not UNSET:
                if prompt is None:
                    page_row.prompt = None
                else:
                    prompt_clean = prompt.strip()
                    page_row.prompt = prompt_clean if prompt_clean else None

            if image_format is not UNSET:
                page_row.image_format = _normalize_optional_setting(
                    image_format,
                    allowed=_ALLOWED_IMAGE_FORMATS,
                    field="image_format",
                )

            if image_quality is not UNSET:
                page_row.image_quality = _normalize_optional_setting(
                    image_quality,
                    allowed=_ALLOWED_IMAGE_QUALITIES,
                    field="image_quality",
                )

            if generation_model is not UNSET:
                page_row.generation_model = _normalize_optional_setting(
                    generation_model,
                    allowed=_ALLOWED_GENERATION_MODELS,
                    field="generation_model",
                )

            post_row.updated_at = datetime.now(tz=UTC)
            session.add(post_row)
            session.commit()

            page_row = session.get(
                InstagramPostPage,
                page_row.id,
                options=[joinedload(InstagramPostPage.media_versions)],
            )
            if page_row is None:
                raise ValueError("Failed to load created post page")
            return _post_page_to_gql(page_row)
