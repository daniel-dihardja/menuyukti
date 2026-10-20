"""Allowed location listing kinds (commercial vs community)."""

from __future__ import annotations

LISTING_KIND_COMMERCIAL = "commercial"
LISTING_KIND_COMMUNITY = "community"

LISTING_KIND_VALUES: frozenset[str] = frozenset(
    {
        LISTING_KIND_COMMERCIAL,
        LISTING_KIND_COMMUNITY,
    }
)

DEFAULT_LISTING_KIND = LISTING_KIND_COMMERCIAL


def normalize_listing_kind(raw: str | None) -> str:
    """Return a valid listing_kind or raise ValueError."""
    if raw is None:
        return DEFAULT_LISTING_KIND
    cleaned = raw.strip().lower()
    if cleaned not in LISTING_KIND_VALUES:
        raise ValueError(
            f"Invalid listing_kind: {raw!r}. Allowed: {', '.join(sorted(LISTING_KIND_VALUES))}"
        )
    return cleaned
