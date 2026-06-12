"""LangSmith / LangChain tracing helpers."""

from __future__ import annotations

import logging
import os

_logger = logging.getLogger(__name__)


def langchain_tracing_enabled() -> bool:
    raw = os.environ.get("LANGCHAIN_TRACING_V2", "").strip().lower()
    return raw in ("true", "1", "yes", "on")


def try_langsmith_external_trace_id() -> str | None:
    """Best-effort LangSmith trace or run id when tracing is enabled."""
    if not langchain_tracing_enabled():
        return None
    try:
        from langsmith.run_helpers import get_current_run_tree
    except ImportError:
        _logger.debug("tracing: langsmith not installed")
        return None
    try:
        tree = get_current_run_tree()
    except Exception:
        _logger.debug("tracing: get_current_run_tree failed", exc_info=True)
        return None
    if tree is None:
        return None
    trace_id = getattr(tree, "trace_id", None) or getattr(tree, "id", None)
    if trace_id is None:
        return None
    return str(trace_id)
