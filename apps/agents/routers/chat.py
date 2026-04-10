"""Streaming chat HTTP endpoint."""

import json
from collections.abc import AsyncIterator
from typing import Annotated, Literal

import httpx
from agents_app.agents.core.chat.graph import build_chat_graph, messages_from_roles
from agents_app.deps import get_http_client
from fastapi import APIRouter, Depends, Header, HTTPException
from fastapi.responses import StreamingResponse
from langchain_core.messages import BaseMessage
from pydantic import BaseModel, Field

router = APIRouter()


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1)


class ChatRequest(BaseModel):
    messages: list[ChatMessage] = Field(min_length=1)
    workflow_id: str | None = None
    milestone_id: str | None = None
    location_id: int | None = Field(default=None, ge=1)


def _sse_data_line(payload: dict[str, str]) -> str:
    return f"data: {json.dumps(payload, ensure_ascii=False)}\n\n"


async def _stream_chat_events(
    lc_messages: list[BaseMessage],
    *,
    workflow_id: str | None = None,
    milestone_id: str | None = None,
    location_id: int | None = None,
    user_id: str | None = None,
    http_client: httpx.AsyncClient | None = None,
) -> AsyncIterator[str]:
    graph = build_chat_graph(
        workflow_id=workflow_id,
        milestone_id=milestone_id,
        location_id=location_id,
        user_id=user_id,
        http_client=http_client,
    )
    async for event in graph.astream_events(
        {"messages": lc_messages},
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


@router.post("/chat")
async def chat_stream(
    body: ChatRequest,
    client: Annotated[httpx.AsyncClient, Depends(get_http_client)],
    x_menuyukti_user_id: Annotated[str | None, Header(alias="X-Menuyukti-User-Id")] = None,
) -> StreamingResponse:
    """Stream assistant tokens as Server-Sent Events (``data: {...}\\n\\n``)."""
    try:
        lc_messages = messages_from_roles([m.model_dump() for m in body.messages])
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e

    return StreamingResponse(
        _stream_chat_events(
            lc_messages,
            workflow_id=body.workflow_id,
            milestone_id=body.milestone_id,
            location_id=body.location_id,
            user_id=x_menuyukti_user_id,
            http_client=client,
        ),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
