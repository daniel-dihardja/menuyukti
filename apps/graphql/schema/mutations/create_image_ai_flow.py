"""Create a configurable image AI flow."""

from __future__ import annotations

import re

import strawberry
from strawberry.scalars import JSON

from graphql.data_sources import ImageAiFlow, SessionLocal
from graphql.schema.auth import user_id_from_info
from graphql.schema.queries.image_ai_flows import _flow_to_gql
from graphql.schema.types import ImageAiFlowType

_SLUG_RE = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")


def _normalize_slug(raw: str) -> str:
    return raw.strip().lower()


def _validate_slug(raw: str) -> str:
    slug = _normalize_slug(raw)
    if not slug:
        msg = "Slug is required"
        raise ValueError(msg)
    if not _SLUG_RE.match(slug):
        msg = "Invalid slug: use lowercase letters, numbers, and hyphens"
        raise ValueError(msg)
    return slug


@strawberry.type
class CreateImageAiFlowMutation:
    @strawberry.mutation
    def create_image_ai_flow(
        self,
        info: strawberry.Info,
        slug: str,
        display_name: str,
        prompt: str,
        model: str,
        prompt_enhance: str | None = None,
        image_reference_strength: str | None = None,
        style_ids: JSON | None = None,
        is_active: bool = True,
        sort_order: int = 0,
    ) -> ImageAiFlowType:
        user_id = user_id_from_info(info)
        if not user_id:
            raise ValueError("Missing authenticated user for createImageAiFlow")

        slug_clean = _validate_slug(slug)
        display = display_name.strip()
        prompt_clean = prompt.strip()
        model_clean = model.strip()
        if not display:
            raise ValueError("Display name is required")
        if not prompt_clean:
            raise ValueError("Prompt is required")
        if not model_clean:
            raise ValueError("Model is required")

        session = SessionLocal()
        try:
            existing = session.query(ImageAiFlow).filter(ImageAiFlow.slug == slug_clean).first()
            if existing is not None:
                raise ValueError(f"An image AI flow with slug '{slug_clean}' already exists")

            row = ImageAiFlow(
                slug=slug_clean,
                display_name=display,
                prompt=prompt_clean,
                model=model_clean,
                prompt_enhance=prompt_enhance.strip() if prompt_enhance else None,
                image_reference_strength=(
                    image_reference_strength.strip() if image_reference_strength else None
                ),
                style_ids=style_ids,
                is_active=is_active,
                sort_order=sort_order,
            )
            session.add(row)
            session.commit()
            session.refresh(row)
            return _flow_to_gql(row)
        finally:
            session.close()
