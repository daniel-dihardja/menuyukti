"""Request-scoped HTTP client for chat tools (not stored in LangGraph checkpoints)."""

from __future__ import annotations

import contextvars

import httpx

chat_http_client_var: contextvars.ContextVar[httpx.AsyncClient | None] = contextvars.ContextVar(
    "chat_http_client_var",
    default=None,
)


def get_chat_http_client() -> httpx.AsyncClient:
    client = chat_http_client_var.get()
    if client is None:
        msg = "Chat HTTP client is not bound to this request"
        raise RuntimeError(msg)
    return client
