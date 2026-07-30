"""FastAPI ASGI entrypoint for the agents service."""

import logging
import os
from contextlib import asynccontextmanager
from typing import Any

import httpx
from agents_app.agents.core.chat.graph import compile_chat_graph
from agents_app.routers.chat import router as chat_router
from agents_app.routers.format_markdown import router as format_markdown_router
from agents_app.routers.milestone_run import router as milestone_run_router
from agents_app.routers.style_specs import router as style_specs_router
from dotenv import load_dotenv
from fastapi import FastAPI
from langgraph.checkpoint.base import BaseCheckpointSaver
from langgraph.checkpoint.memory import InMemorySaver
from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

load_dotenv()


def _configure_agents_app_logging() -> None:
    """Emit INFO logs from ``agents_app`` (e.g. milestone run fetch steps) without raising root level."""
    pkg = logging.getLogger("agents_app")
    if pkg.handlers:
        return
    handler = logging.StreamHandler()
    handler.setFormatter(logging.Formatter("%(levelname)s [%(name)s] %(message)s"))
    pkg.addHandler(handler)
    pkg.setLevel(logging.INFO)
    pkg.propagate = False


_configure_agents_app_logging()


def _expected_internal_api_key() -> str:
    """Shared secret with GraphQL / web BFF (``INTERNAL_API_KEY`` or ``GRAPHQL_INTERNAL_API_KEY``)."""
    return (
        os.environ.get("INTERNAL_API_KEY", "").strip()
        or os.environ.get("GRAPHQL_INTERNAL_API_KEY", "").strip()
    )


class InternalApiKeyMiddleware(BaseHTTPMiddleware):
    """When an internal API key is set, require ``X-Internal-Api-Key`` (except ``GET /health``)."""

    async def dispatch(self, request: Request, call_next: Any) -> Response:
        if request.url.path == "/health" and request.method == "GET":
            return await call_next(request)
        expected = _expected_internal_api_key()
        if expected and request.headers.get("X-Internal-Api-Key", "") != expected:
            return Response(status_code=403)
        return await call_next(request)


@asynccontextmanager
async def _chat_runtime(app: FastAPI, checkpointer: BaseCheckpointSaver) -> Any:
    app.state.chat_checkpointer = checkpointer
    app.state.chat_graph = compile_chat_graph(checkpointer)
    async with httpx.AsyncClient(
        limits=httpx.Limits(max_connections=20, max_keepalive_connections=10),
        timeout=httpx.Timeout(60.0),
    ) as http_client:
        app.state.http_client = http_client
        yield


@asynccontextmanager
async def lifespan(app: FastAPI) -> Any:
    db_url = os.environ.get("LANGGRAPH_CHECKPOINT_DATABASE_URL", "").strip()
    # Sync PostgresSaver does not implement aget_tuple; FastAPI chat uses async graph APIs.
    if db_url:
        async with AsyncPostgresSaver.from_conn_string(db_url) as checkpointer:
            await checkpointer.setup()
            async with _chat_runtime(app, checkpointer):
                yield
    else:
        async with _chat_runtime(app, InMemorySaver()):
            yield


app = FastAPI(
    title="Menuyukti Agents",
    description="LangChain / LangGraph agent HTTP API",
    lifespan=lifespan,
)
app.add_middleware(InternalApiKeyMiddleware)
app.include_router(chat_router, tags=["chat"])
app.include_router(format_markdown_router, tags=["core", "format-markdown"])
app.include_router(milestone_run_router, tags=["milestones"])
app.include_router(style_specs_router, tags=["style-specs"])


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


__all__ = ["app"]
