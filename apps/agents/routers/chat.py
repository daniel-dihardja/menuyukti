"""Streaming chat HTTP endpoint."""

import json
from collections.abc import AsyncIterator
from typing import Literal

from agents_app.agents.chat_agent import build_chat_graph, messages_from_roles
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from langchain_core.messages import BaseMessage
from pydantic import BaseModel, Field, PositiveInt

router = APIRouter()


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1)


class ChatRequest(BaseModel):
    messages: list[ChatMessage] = Field(min_length=1)
    campaign_id: PositiveInt | None = None


def _sse_data_line(payload: dict[str, str]) -> str:
    return f"data: {json.dumps(payload, ensure_ascii=False)}\n\n"


async def _stream_chat_events(
    lc_messages: list[BaseMessage],
    *,
    campaign_id: int | None = None,
) -> AsyncIterator[str]:
    graph = build_chat_graph(campaign_id=campaign_id)
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
async def chat_stream(body: ChatRequest) -> StreamingResponse:
    """Stream assistant tokens as Server-Sent Events (``data: {...}\\n\\n``)."""
    try:
        lc_messages = messages_from_roles([m.model_dump() for m in body.messages])
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e

    return StreamingResponse(
        _stream_chat_events(lc_messages, campaign_id=body.campaign_id),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
