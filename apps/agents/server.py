"""FastAPI ASGI entrypoint for the agents service."""

import logging
from contextlib import asynccontextmanager
from typing import Any

import httpx
from agents_app.routers.chat import router as chat_router
from agents_app.routers.format_markdown import router as format_markdown_router
from agents_app.routers.milestone_prepare import router as milestone_prepare_router
from agents_app.routers.milestone_run import router as milestone_run_router
from dotenv import load_dotenv
from fastapi import FastAPI

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


@asynccontextmanager
async def lifespan(app: FastAPI) -> Any:
    async with httpx.AsyncClient() as http_client:
        app.state.http_client = http_client
        yield


app = FastAPI(
    title="Menuyukti Agents",
    description="LangChain / LangGraph agent HTTP API",
    lifespan=lifespan,
)
app.include_router(chat_router, tags=["chat"])
app.include_router(format_markdown_router, tags=["core", "format-markdown"])
app.include_router(milestone_prepare_router, tags=["milestones"])
app.include_router(milestone_run_router, tags=["milestones"])


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


__all__ = ["app"]
