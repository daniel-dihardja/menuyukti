"""Normalize public location URL slugs for guest surfaces."""

from __future__ import annotations

import re

from sqlalchemy import select
from sqlalchemy.orm import Session

from graphql.data_sources.models.location import Location

_PUBLIC_SLUG_MAX_LEN = 128
_PUBLIC_SLUG_RE = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")

# Keep in sync with apps/web/lib/public-location/reserved-slugs.ts
RESERVED_PUBLIC_SLUGS = frozenset(
    {
        "about",
        "advisor",
        "agent",
        "analytics",
        "api",
        "calendar",
        "continue",
        "content",
        "crm",
        "dashboard",
        "home",
        "ig-studio",
        "inventar",
        "l",
        "login",
        "m",
        "media",
        "playbooks",
        "print-orders",
        "privacy",
        "profile",
        "services",
        "shop",
        "sign-up",
        "sso-callback",
        "staff",
        "team",
        "terms",
        "usage",
        "workflow",
    }
)


def normalize_public_slug(raw: str | None) -> str | None:
    """Normalize a public location slug to lowercase kebab-case, or None if empty."""
    if raw is None:
        return None
    stripped = raw.strip().lower()
    if not stripped:
        return None
    # Allow operators to paste spaced names; coerce to kebab-case.
    coerced = re.sub(r"[^a-z0-9]+", "-", stripped)
    coerced = re.sub(r"-+", "-", coerced).strip("-")
    if not coerced:
        return None
    if len(coerced) > _PUBLIC_SLUG_MAX_LEN:
        raise ValueError(f"publicSlug must be at most {_PUBLIC_SLUG_MAX_LEN} characters")
    if not _PUBLIC_SLUG_RE.fullmatch(coerced):
        raise ValueError("publicSlug must be lowercase letters, numbers, and hyphens")
    if coerced in RESERVED_PUBLIC_SLUGS:
        raise ValueError(f"publicSlug {coerced!r} is reserved")
    return coerced


def apply_location_public_slug(
    session: Session,
    location: Location,
    public_slug: str | None,
) -> None:
    """Normalize and set ``location.public_slug``, or clear when empty.

    Raises ``ValueError`` for reserved or duplicate slugs.
    """
    normalized = normalize_public_slug(public_slug)
    if normalized is not None:
        conflict = session.scalars(
            select(Location).where(
                Location.public_slug == normalized,
                Location.id != location.id,
            )
        ).one_or_none()
        if conflict is not None:
            raise ValueError("publicSlug is already in use")
        location.public_slug = normalized
    else:
        location.public_slug = None
