"""Validate and normalize API adapter tool inputs (endpoint URL string, tool_key from name)."""

from __future__ import annotations

import re

_MAX_NAME_LEN = 256
_MAX_DESCRIPTION_LEN = 8000
_MAX_URL_LEN = 2048
_MAX_TOOL_KEY_LEN = 128

_NON_ALNUM = re.compile(r"[^a-z0-9]+")


def tool_key_from_name(name: str) -> str:
    """Derive a stable snake_case tool key from a human-readable name."""
    raw = name.strip().lower()
    key = _NON_ALNUM.sub("_", raw).strip("_")
    if not key:
        msg = "Name must contain at least one letter or number"
        raise ValueError(msg)
    if key[0].isdigit():
        key = f"tool_{key}"
    if len(key) > _MAX_TOOL_KEY_LEN:
        key = key[:_MAX_TOOL_KEY_LEN].rstrip("_")
    return key


def normalize_name(name: str) -> str:
    n = name.strip()
    if not n:
        msg = "Name is required"
        raise ValueError(msg)
    if len(n) > _MAX_NAME_LEN:
        msg = f"Name must be at most {_MAX_NAME_LEN} characters"
        raise ValueError(msg)
    return n


def normalize_description(description: str) -> str:
    d = description.strip()
    if not d:
        msg = "Description is required"
        raise ValueError(msg)
    if len(d) > _MAX_DESCRIPTION_LEN:
        msg = f"Description must be at most {_MAX_DESCRIPTION_LEN} characters"
        raise ValueError(msg)
    return d


def validate_tool_url(url: str) -> str:
    """Normalize stored endpoint string: non-empty after strip, max length only."""
    u = url.strip()
    if not u:
        msg = "URL is required"
        raise ValueError(msg)
    if len(u) > _MAX_URL_LEN:
        msg = f"URL must be at most {_MAX_URL_LEN} characters"
        raise ValueError(msg)
    return u
