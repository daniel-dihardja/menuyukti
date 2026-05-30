"""Parse campaign-brief reflection settings from milestone input."""

from __future__ import annotations

from typing import Any

DEFAULT_REFLECTION_ENABLED = True
DEFAULT_MAX_REVISIONS = 2
MAX_REVISIONS_CAP = 3


def parse_reflection_config(milestone_input: dict[str, Any] | None) -> tuple[bool, int]:
    """Return (enabled, max_revisions) with defaults for legacy notes-only input."""
    if not isinstance(milestone_input, dict):
        return DEFAULT_REFLECTION_ENABLED, DEFAULT_MAX_REVISIONS
    value = milestone_input.get("value")
    if not isinstance(value, dict):
        return DEFAULT_REFLECTION_ENABLED, DEFAULT_MAX_REVISIONS
    reflection = value.get("reflection")
    if not isinstance(reflection, dict):
        return DEFAULT_REFLECTION_ENABLED, DEFAULT_MAX_REVISIONS
    enabled = reflection.get("enabled")
    reflection_enabled = enabled if isinstance(enabled, bool) else DEFAULT_REFLECTION_ENABLED
    raw_max = reflection.get("maxRevisions")
    if isinstance(raw_max, int) and not isinstance(raw_max, bool):
        max_revisions = max(0, min(MAX_REVISIONS_CAP, raw_max))
    else:
        max_revisions = DEFAULT_MAX_REVISIONS
    return reflection_enabled, max_revisions
