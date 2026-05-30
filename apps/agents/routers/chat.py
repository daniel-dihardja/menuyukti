"""Streaming chat HTTP endpoint."""

import asyncio
import json
from collections.abc import AsyncIterator
from typing import Annotated, Any, Literal

import httpx
from agents_app.agents.core.chat.allowed_models import CHAT_GATEWAY_MODEL_ALLOWLIST
from agents_app.agents.core.chat.graph import incremental_user_message
from agents_app.agents.core.chat.http_context import chat_http_client_var
from agents_app.deps import get_http_client
from fastapi import APIRouter, Depends, Header, HTTPException, Request
from fastapi.responses import StreamingResponse
from langchain_core.messages import BaseMessage
from langchain_core.runnables import RunnableConfig
from langgraph.graph.state import CompiledStateGraph
from pydantic import BaseModel, ConfigDict, Field

router = APIRouter()


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1)


class ChatRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    messages: list[ChatMessage] = Field(min_length=1)
    workflow_id: str | None = None
    milestone_id: str | None = None
    location_id: int | None = Field(default=None, ge=1)
    agent_thread_id: str | None = Field(default=None, min_length=1)
    workflow_chat_session_id: str | None = Field(default=None, min_length=1)
    chat_model: str | None = Field(
        default=None,
        max_length=120,
        alias="model",
        description="Vercel AI Gateway id (provider/model); must be in the chat allowlist.",
    )


def _sse_data_line(payload: dict[str, str]) -> str:
    return f"data: {json.dumps(payload, ensure_ascii=False)}\n\n"


def _resolve_thread_id(
    user_id: str | None,
    workflow_id: str | None,
    agent_thread_id: str | None,
    workflow_chat_session_id: str | None,
) -> str:
    if not user_id:
        raise HTTPException(status_code=401, detail="Missing X-Menuyukti-User-Id")
    if workflow_id:
        base = f"{user_id}:wf:{workflow_id}"
        if workflow_chat_session_id:
            return f"{base}:sess:{workflow_chat_session_id}"
        return base
    if agent_thread_id:
        return f"{user_id}:agent:{agent_thread_id}"
    raise HTTPException(
        status_code=400,
        detail="workflow_id or agent_thread_id is required",
    )


def _runnable_config(
    *,
    thread_id: str,
    workflow_id: str | None,
    milestone_id: str | None,
    location_id: int | None,
    user_id: str | None,
    chat_gateway_model: str | None,
) -> RunnableConfig:
    configurable: dict[str, Any] = {
        "thread_id": thread_id,
        "workflow_id": workflow_id,
        "milestone_id": milestone_id,
        "location_id": location_id,
        "user_id": user_id,
    }
    if chat_gateway_model is not None:
        configurable["chat_gateway_model"] = chat_gateway_model
    return RunnableConfig(configurable=configurable)


def _resolved_chat_gateway_model(raw: str | None) -> str | None:
    if raw is None:
        return None
    s = raw.strip()
    if not s:
        return None
    if s not in CHAT_GATEWAY_MODEL_ALLOWLIST:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported chat model: {s}. Use a gateway id from the app model list.",
        )
    return s


async def _stream_chat_events(
    graph: CompiledStateGraph,
    lc_messages: list[BaseMessage],
    *,
    runnable_config: RunnableConfig,
    http_client: httpx.AsyncClient,
) -> AsyncIterator[str]:
    token = chat_http_client_var.set(http_client)
    try:
        async for event in graph.astream_events(
            {"messages": lc_messages},
            runnable_config,
            version="v2",
        ):
            if event.get("event") != "on_chat_model_stream":
                continue
            data = event.get("data") or {}
            chunk = data.get("chunk")
            if chunk is None:
                continue
            text = getattr(chunk, "content", None)
            if not text:
                continue
            if isinstance(text, str):
                yield _sse_data_line({"token": text})
            elif isinstance(text, list):
                # Skip non-text blocks in streaming for now
                continue
    except asyncio.CancelledError:
        raise
    finally:
        chat_http_client_var.reset(token)


@router.post("/chat")
async def chat_stream(
    request: Request,
    body: ChatRequest,
    client: Annotated[httpx.AsyncClient, Depends(get_http_client)],
    x_menuyukti_user_id: Annotated[str | None, Header(alias="X-Menuyukti-User-Id")] = None,
) -> StreamingResponse:
    """Stream assistant tokens as Server-Sent Events (``data: {...}\\n\\n``)."""
    graph = getattr(request.app.state, "chat_graph", None)
    if graph is None:
        raise HTTPException(status_code=503, detail="Chat graph is not initialized")

    try:
        human = incremental_user_message([m.model_dump() for m in body.messages])
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e

    thread_id = _resolve_thread_id(
        x_menuyukti_user_id,
        body.workflow_id,
        body.agent_thread_id,
        body.workflow_chat_session_id,
    )
    gateway_model = _resolved_chat_gateway_model(body.chat_model)
    cfg = _runnable_config(
        thread_id=thread_id,
        workflow_id=body.workflow_id,
        milestone_id=body.milestone_id,
        location_id=body.location_id,
        user_id=x_menuyukti_user_id,
        chat_gateway_model=gateway_model,
    )

    return StreamingResponse(
        _stream_chat_events(
            graph,
            [human],
            runnable_config=cfg,
            http_client=client,
        ),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
