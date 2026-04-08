"""FastAPI dependency helpers."""

from __future__ import annotations

import httpx
from fastapi import Request


def get_http_client(request: Request) -> httpx.AsyncClient:
    """Shared AsyncClient from app lifespan (connection pooling)."""
    return request.app.state.http_client
