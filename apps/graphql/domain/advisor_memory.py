"""Validate and normalize location advisor memory text content."""

from __future__ import annotations

ADVISOR_MEMORY_MAX_CHARS = 8000


def normalize_advisor_memory_content(raw: object) -> str:
    """Return stripped content, or empty string when cleared.

    Raises ValueError when ``raw`` is not a string or exceeds the size cap.
    """
    if not isinstance(raw, str):
        raise ValueError("content must be a string")
    text = raw.strip()
    if len(text) > ADVISOR_MEMORY_MAX_CHARS:
        raise ValueError(
            f"content must be at most {ADVISOR_MEMORY_MAX_CHARS} characters"
        )
    return text
