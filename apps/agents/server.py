"""FastAPI ASGI entrypoint for the agents service."""

import logging
import os
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from typing import Any

import httpx
from agents_app.agents.core.chat.graph import compile_chat_graph
from agents_app.routers.chat import router as chat_router
from agents_app.routers.format_markdown import router as format_markdown_router
from agents_app.routers.style_specs import router as style_specs_router
from dotenv import load_dotenv
from fastapi import FastAPI
from langgraph.checkpoint.base import BaseCheckpointSaver
from langgraph.checkpoint.memory import InMemorySaver
from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver
from psycopg import AsyncConnection
from psycopg.rows import DictRow, dict_row
from psycopg_pool import AsyncConnectionPool
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

load_dotenv()

_logger = logging.getLogger(__name__)


def _configure_agents_app_logging() -> None:
    """Emit INFO logs from ``agents_app`` without raising root level."""
    pkg = logging.getLogger("agents_app")
    if pkg.handlers:
        return
    handler = logging.StreamHandler()
    handler.setFormatter(logging.Formatter("%(levelname)s [%(name)s] %(message)s"))
    pkg.addHandler(handler)
    pkg.setLevel(logging.INFO)
    pkg.propagate = False


_configure_agents_app_logging()


def _env_flag_true(name: str) -> bool:
    return os.environ.get(name, "").strip().lower() in {"1", "true", "yes", "on"}


def is_production_runtime() -> bool:
    """True when deployed production-like (or explicit AGENTS_ENV=production)."""
    for key in ("AGENTS_ENV", "ENV", "VERCEL_ENV", "NODE_ENV"):
        if os.environ.get(key, "").strip().lower() == "production":
            return True
    return False


def _expected_internal_api_key() -> str:
    """Shared secret with GraphQL / web BFF (``INTERNAL_API_KEY`` or ``GRAPHQL_INTERNAL_API_KEY``)."""
    return (
        os.environ.get("INTERNAL_API_KEY", "").strip()
        or os.environ.get("GRAPHQL_INTERNAL_API_KEY", "").strip()
    )


def validate_startup_security() -> None:
    """Fail fast in production when checkpoint DB or internal API key is missing."""
    require_key = is_production_runtime() or _env_flag_true("AGENTS_REQUIRE_INTERNAL_API_KEY")
    if require_key and not _expected_internal_api_key():
        msg = (
            "INTERNAL_API_KEY or GRAPHQL_INTERNAL_API_KEY must be set in production "
            "(or set AGENTS_REQUIRE_INTERNAL_API_KEY=0 only for local dev)."
        )
        raise RuntimeError(msg)

    db_url = os.environ.get("LANGGRAPH_CHECKPOINT_DATABASE_URL", "").strip()
    require_db = is_production_runtime() or _env_flag_true("AGENTS_REQUIRE_CHECKPOINT_DB")
    if not db_url:
        if require_db:
            msg = (
                "LANGGRAPH_CHECKPOINT_DATABASE_URL must be set in production "
                "(InMemorySaver loses history on restart / across instances)."
            )
            raise RuntimeError(msg)
        _logger.warning(
            "LANGGRAPH_CHECKPOINT_DATABASE_URL unset — using InMemorySaver "
            "(chat history is lost on restart and not shared across workers)"
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
async def _postgres_checkpointer(db_url: str) -> AsyncIterator[AsyncPostgresSaver]:
    """Pool-backed checkpointer so idle DB/proxy timeouts do not leave a dead single conn.

    ``AsyncPostgresSaver.from_conn_string`` holds one connection for the process lifetime;
    after Postgres/proxy idle kill, ``/chat/history`` fails with ``the connection is closed``.
    """
    pool: AsyncConnectionPool[AsyncConnection[DictRow]] = AsyncConnectionPool(
        conninfo=db_url,
        min_size=1,
        max_size=10,
        # Recycle before typical cloud idle kills (~10m); check drops dead sockets.
        max_idle=300.0,
        max_lifetime=3600.0,
        timeout=30.0,
        kwargs={
            "autocommit": True,
            "prepare_threshold": 0,
            "row_factory": dict_row,
        },
        open=False,
        check=AsyncConnectionPool.check_connection,
    )
    await pool.open()
    try:
        checkpointer = AsyncPostgresSaver(conn=pool)
        await checkpointer.setup()
        yield checkpointer
    finally:
        await pool.close()


@asynccontextmanager
async def lifespan(app: FastAPI) -> Any:
    validate_startup_security()
    db_url = os.environ.get("LANGGRAPH_CHECKPOINT_DATABASE_URL", "").strip()
    # Sync PostgresSaver does not implement aget_tuple; FastAPI chat uses async graph APIs.
    if db_url:
        async with _postgres_checkpointer(db_url) as checkpointer:
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
app.include_router(style_specs_router, tags=["style-specs"])


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
