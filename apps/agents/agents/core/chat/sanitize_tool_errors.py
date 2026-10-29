"""Sanitize tool failure text shown to the model (avoid leaking internals)."""

from __future__ import annotations

import logging

logger = logging.getLogger(__name__)


def sanitize_tool_error_for_model(tool_name: str, exc: BaseException) -> str:
    """Return a stable, non-leaky error string for ToolMessages / tool returns."""
    name = (tool_name or "tool").strip() or "tool"
    logger.warning("chat tool %s failed: %s", name, exc, exc_info=True)
    return f"Error running {name}: tool failed"


def sanitize_tool_error_message(tool_name: str, exc: BaseException) -> str:
    """Alias used by in-tool ``return`` paths (same wording as middleware)."""
    return sanitize_tool_error_for_model(tool_name, exc)
