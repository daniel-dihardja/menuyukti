"""Helpers for location style pack writes (default exclusivity, validation)."""

from __future__ import annotations

from sqlalchemy.orm import Session

from graphql.data_sources.models.location_style import LocationStyle

_MAX_NAME_LEN = 128
_MAX_RULES_LEN = 4000
_MAX_IMAGE_NAME_LEN = 512


def validate_style_fields(
    *,
    name: str,
    rules: str,
    reference_image_name: str,
) -> tuple[str, str, str]:
    name_clean = name.strip()
    rules_clean = rules.strip()
    image_clean = reference_image_name.strip()
    if not name_clean:
        raise ValueError("Name is required")
    if len(name_clean) > _MAX_NAME_LEN:
        raise ValueError(f"Name must be at most {_MAX_NAME_LEN} characters")
    if not rules_clean:
        raise ValueError("Rules are required")
    if len(rules_clean) > _MAX_RULES_LEN:
        raise ValueError(f"Rules must be at most {_MAX_RULES_LEN} characters")
    if not image_clean:
        raise ValueError("Reference image name is required")
    if len(image_clean) > _MAX_IMAGE_NAME_LEN:
        raise ValueError(f"Reference image name must be at most {_MAX_IMAGE_NAME_LEN} characters")
    return name_clean, rules_clean, image_clean


def clear_other_defaults(session: Session, location_id: int, keep_id: int | None = None) -> None:
    """Ensure at most one is_default=True per location."""
    q = session.query(LocationStyle).filter(
        LocationStyle.location_id == location_id,
        LocationStyle.is_default.is_(True),
    )
    if keep_id is not None:
        q = q.filter(LocationStyle.id != keep_id)
    for row in q.all():
        row.is_default = False
