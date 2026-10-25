"""Per-request context for ChatKit → LangGraph runs."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

import httpx
from langgraph.graph.state import CompiledStateGraph


@dataclass
class ChatKitRequestContext:
    """Identity and advisor shell state forwarded from the web BFF."""

    user_id: str
    agent_thread_id: str
    location_id: int | None = None
    analytics_run_id: int | None = None
    chat_mode: str | None = None
    chat_model: str | None = None
    generation_model: str | None = None
    image_format: str | None = None
    image_quality: str | None = None
    graph: CompiledStateGraph | None = None
    http_client: httpx.AsyncClient | None = None
    extra: dict[str, Any] = field(default_factory=dict)
