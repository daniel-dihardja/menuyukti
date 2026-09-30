"""Normalize public location URL slugs for digital menu publish."""

from __future__ import annotations

import re

_PUBLIC_SLUG_MAX_LEN = 128
_PUBLIC_SLUG_RE = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")


def normalize_public_slug(raw: str | None) -> str | None:
    """Normalize a public menu slug to lowercase kebab-case, or None if empty."""
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
    return coerced
