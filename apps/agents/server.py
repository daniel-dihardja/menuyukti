"""FastAPI ASGI entrypoint for the agents service."""

from contextlib import asynccontextmanager
from typing import Any

from agents_app.routers.chat import router as chat_router
from dotenv import load_dotenv
from fastapi import FastAPI

load_dotenv()


@asynccontextmanager
async def lifespan(_app: FastAPI) -> Any:
    yield


app = FastAPI(
    title="Menuyukti Agents",
    description="LangChain / LangGraph agent HTTP API",
    lifespan=lifespan,
)
app.include_router(chat_router, tags=["chat"])


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
