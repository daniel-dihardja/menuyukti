"""Update media and prompt on a post page."""

from __future__ import annotations

from datetime import UTC, datetime

import strawberry
from sqlalchemy.orm import joinedload
from strawberry import UNSET

from graphql.context import request_session_scope
from graphql.data_sources import InstagramPostPage, InstagramPostPageMediaVersion
from graphql.schema.auth import user_id_from_info
from graphql.schema.media_s3_keys import validate_workspace_post_media_s3_key
from graphql.schema.queries.posts import _load_post_for_user, _post_page_to_gql
from graphql.schema.types import PostPageType

_ALLOWED_IMAGE_FORMATS = frozenset({"feed", "tall", "square", "story", "wide"})
_ALLOWED_IMAGE_QUALITIES = frozenset({"standard", "high", "ultra"})
_ALLOWED_GENERATION_MODELS = frozenset(
    {"gemini-2.5-flash-image", "nano-banana-2", "gemini-image-2"}
)


def _validate_media_s3_key(
    key: str,
    *,
    workspace_id: int | None,
    owner_clerk_user_id: str,
) -> None:
    validate_workspace_post_media_s3_key(
        key,
        workspace_id=workspace_id,
        owner_clerk_user_id=owner_clerk_user_id,
        error_message="Invalid media_s3_key for updatePostPage",
    )


def _post_media_scope(session, post_row) -> tuple[int | None, str]:
    from graphql.schema.media_s3_keys import resolve_workspace_media_scope_for_post

    return resolve_workspace_media_scope_for_post(
        session,
        post_row.workspace_id,
        post_row.created_by_clerk_user_id,
    )
def _normalize_optional_setting(
    value: str | None, *, allowed: frozenset[str], field: str
) -> str | None:
    if value is None:
        return None
    cleaned = value.strip()
    if cleaned == "":
        return None
    if cleaned not in allowed:
        raise ValueError(f"Invalid {field} for updatePostPage")
    return cleaned


@strawberry.type
class UpdatePostPageMutation:
    @strawberry.mutation
    def update_post_page(
        self,
        info: strawberry.Info,
        id: strawberry.ID,
        media_s3_key: str | None = UNSET,
        prompt: str | None = UNSET,
        image_format: str | None = UNSET,
        image_quality: str | None = UNSET,
        generation_model: str | None = UNSET,
    ) -> PostPageType:
        user_id = user_id_from_info(info)
        if not user_id:
            raise ValueError("Missing authenticated user for updatePostPage")

        try:
            page_pk = int(str(id))
        except ValueError as e:
            raise ValueError("Invalid post page id") from e
        if page_pk < 1:
            raise ValueError("Invalid post page id")

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
                raise PermissionError("Not allowed to update this post page")

            workspace_id, owner_id = _post_media_scope(session, post_row)

            if media_s3_key is not UNSET:
                if media_s3_key is None:
                    page_row.media_s3_key = None
                else:
                    key_clean = media_s3_key.strip()
                    if key_clean == "":
                        page_row.media_s3_key = None
                    else:
                        _validate_media_s3_key(
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
                                version_prompt: str | None
                                if prompt is not UNSET:
                                    if prompt is None:
                                        version_prompt = None
                                    else:
                                        prompt_clean = prompt.strip()
                                        version_prompt = prompt_clean if prompt_clean else None
                                else:
                                    version_prompt = page_row.prompt

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
