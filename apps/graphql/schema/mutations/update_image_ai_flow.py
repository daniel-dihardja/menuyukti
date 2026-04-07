"""Update an existing image AI flow by slug."""

from __future__ import annotations

import re

import strawberry
from strawberry import UNSET
from strawberry.scalars import JSON

from graphql.data_sources.database import ImageAiFlow, SessionLocal
from graphql.schema.auth import user_id_from_info
from graphql.schema.queries.image_ai_flows import _flow_to_gql
from graphql.schema.types import ImageAiFlowType

_SLUG_RE = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")


def _normalize_slug(raw: str) -> str:
    return raw.strip().lower()


def _validate_slug_optional(raw: str | None) -> str | None:
    if raw is None:
        return None
    slug = _normalize_slug(raw)
    if not slug:
        return None
    if not _SLUG_RE.match(slug):
        msg = "Invalid slug: use lowercase letters, numbers, and hyphens"
        raise ValueError(msg)
    return slug


@strawberry.type
class UpdateImageAiFlowMutation:
    @strawberry.mutation
    def update_image_ai_flow(
        self,
        info: strawberry.Info,
        slug: str,
        new_slug: str | None = UNSET,
        display_name: str | None = UNSET,
        prompt: str | None = UNSET,
        model: str | None = UNSET,
        prompt_enhance: str | None = UNSET,
        image_reference_strength: str | None = UNSET,
        style_ids: JSON | None = UNSET,
        is_active: bool | None = UNSET,
        sort_order: int | None = UNSET,
    ) -> ImageAiFlowType:
        user_id = user_id_from_info(info)
        if not user_id:
            raise ValueError("Missing authenticated user for updateImageAiFlow")

        slug_key = _normalize_slug(slug)
        if not slug_key:
            raise ValueError("Slug is required")

        session = SessionLocal()
        try:
            row = session.query(ImageAiFlow).filter(ImageAiFlow.slug == slug_key).first()
            if row is None:
                raise ValueError("Image AI flow not found")

            if new_slug is not UNSET:
                new_slug_clean = _validate_slug_optional(new_slug)
                if new_slug_clean is not None and new_slug_clean != row.slug:
                    taken = (
                        session.query(ImageAiFlow)
                        .filter(ImageAiFlow.slug == new_slug_clean)
                        .first()
                    )
                    if taken is not None:
                        raise ValueError(
                            f"An image AI flow with slug '{new_slug_clean}' already exists"
                        )
                    row.slug = new_slug_clean

            if display_name is not UNSET:
                if display_name is None:
                    raise ValueError("Display name cannot be null")
                d = display_name.strip()
                if not d:
                    raise ValueError("Display name cannot be empty")
                row.display_name = d

            if prompt is not UNSET:
                if prompt is None:
                    raise ValueError("Prompt cannot be null")
                p = prompt.strip()
                if not p:
                    raise ValueError("Prompt cannot be empty")
                row.prompt = p

            if model is not UNSET:
                if model is None:
                    raise ValueError("Model cannot be null")
                m = model.strip()
                if not m:
                    raise ValueError("Model cannot be empty")
                row.model = m

            if prompt_enhance is not UNSET:
                row.prompt_enhance = (
                    prompt_enhance.strip() if prompt_enhance and prompt_enhance.strip() else None
                )

            if image_reference_strength is not UNSET:
                row.image_reference_strength = (
                    image_reference_strength.strip()
                    if image_reference_strength and image_reference_strength.strip()
                    else None
                )

            if style_ids is not UNSET:
                row.style_ids = style_ids

            if is_active is not UNSET:
                if is_active is None:
                    raise ValueError("isActive cannot be null")
                row.is_active = is_active

            if sort_order is not UNSET:
                if sort_order is None:
                    raise ValueError("sortOrder cannot be null")
                row.sort_order = sort_order

            session.commit()
            session.refresh(row)
            return _flow_to_gql(row)
        finally:
            session.close()
