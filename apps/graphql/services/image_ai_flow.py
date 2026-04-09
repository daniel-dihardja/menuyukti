"""Image AI flow updates (validation + persistence)."""

from __future__ import annotations

import re

from sqlalchemy.orm import Session
from strawberry import UNSET
from strawberry.scalars import JSON

from graphql.data_sources import ImageAiFlow

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


def update_image_ai_flow(
    session: Session,
    *,
    slug: str,
    new_slug: str | object = UNSET,
    display_name: str | object = UNSET,
    prompt: str | object = UNSET,
    model: str | object = UNSET,
    prompt_enhance: str | object = UNSET,
    image_reference_strength: str | object = UNSET,
    style_ids: JSON | object = UNSET,
    is_active: bool | object = UNSET,
    sort_order: int | object = UNSET,
) -> ImageAiFlow:
    """Apply validated updates to the flow identified by `slug`. Caller commits."""
    slug_key = _normalize_slug(slug)
    if not slug_key:
        raise ValueError("Slug is required")

    row = session.query(ImageAiFlow).filter(ImageAiFlow.slug == slug_key).first()
    if row is None:
        raise ValueError("Image AI flow not found")

    if new_slug is not UNSET:
        new_slug_clean = _validate_slug_optional(new_slug)  # type: ignore[arg-type]
        if new_slug_clean is not None and new_slug_clean != row.slug:
            taken = session.query(ImageAiFlow).filter(ImageAiFlow.slug == new_slug_clean).first()
            if taken is not None:
                raise ValueError(f"An image AI flow with slug '{new_slug_clean}' already exists")
            row.slug = new_slug_clean

    if display_name is not UNSET:
        if display_name is None:
            raise ValueError("Display name cannot be null")
        d = display_name.strip()  # type: ignore[union-attr]
        if not d:
            raise ValueError("Display name cannot be empty")
        row.display_name = d

    if prompt is not UNSET:
        if prompt is None:
            raise ValueError("Prompt cannot be null")
        p = prompt.strip()  # type: ignore[union-attr]
        if not p:
            raise ValueError("Prompt cannot be empty")
        row.prompt = p

    if model is not UNSET:
        if model is None:
            raise ValueError("Model cannot be null")
        m = model.strip()  # type: ignore[union-attr]
        if not m:
            raise ValueError("Model cannot be empty")
        row.model = m

    if prompt_enhance is not UNSET:
        row.prompt_enhance = (
            prompt_enhance.strip()  # type: ignore[union-attr]
            if prompt_enhance and prompt_enhance.strip()
            else None
        )

    if image_reference_strength is not UNSET:
        row.image_reference_strength = (
            image_reference_strength.strip()  # type: ignore[union-attr]
            if image_reference_strength and image_reference_strength.strip()
            else None
        )

    if style_ids is not UNSET:
        row.style_ids = style_ids  # type: ignore[assignment]

    if is_active is not UNSET:
        if is_active is None:
            raise ValueError("isActive cannot be null")
        row.is_active = is_active  # type: ignore[assignment]

    if sort_order is not UNSET:
        if sort_order is None:
            raise ValueError("sortOrder cannot be null")
        row.sort_order = sort_order  # type: ignore[assignment]

    session.commit()
    session.refresh(row)
    return row
