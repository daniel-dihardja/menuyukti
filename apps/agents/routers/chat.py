"""Streaming chat HTTP endpoint."""

import asyncio
import json
from collections.abc import AsyncIterator, Iterator
from typing import Annotated, Any, Literal

import httpx
from agents_app.agents.core.chat.allowed_models import CHAT_GATEWAY_MODEL_ALLOWLIST
from agents_app.agents.core.chat.graph import CHAT_RECURSION_LIMIT, incremental_user_message
from agents_app.agents.core.chat.http_context import chat_http_client_var
from agents_app.agents.errors import structured_error_payload
from agents_app.deps import get_http_client
from fastapi import APIRouter, Depends, Header, HTTPException, Request
from fastapi.responses import StreamingResponse
from langchain_core.messages import AIMessage, BaseMessage, ToolMessage
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


def _sse_data_line(payload: object) -> str:
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
    return RunnableConfig(configurable=configurable, recursion_limit=CHAT_RECURSION_LIMIT)


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


def _chunk_text(content: object) -> str | None:
    """Extract streamable text from LangChain message chunk content."""
    if not content:
        return None
    if isinstance(content, str):
        return content if content else None
    if isinstance(content, list):
        parts: list[str] = []
        for block in content:
            if isinstance(block, str):
                parts.append(block)
            elif isinstance(block, dict) and block.get("type") == "text":
                text = block.get("text")
                if isinstance(text, str) and text:
                    parts.append(text)
        joined = "".join(parts)
        return joined if joined else None
    return None


def _tool_name_from_call(tool_call: object) -> str | None:
    if isinstance(tool_call, dict):
        name = tool_call.get("name")
        return name if isinstance(name, str) and name else None
    name = getattr(tool_call, "name", None)
    return name if isinstance(name, str) and name else None


def _tool_events_from_update(update: object) -> Iterator[tuple[str, str]]:
    """Yield (tool_start|tool_end, tool_name) pairs from a LangGraph updates chunk."""
    if not isinstance(update, dict):
        return
    for state_delta in update.values():
        if not isinstance(state_delta, dict):
            continue
        messages = state_delta.get("messages") or []
        for msg in messages:
            if isinstance(msg, AIMessage):
                for tool_call in msg.tool_calls or []:
                    name = _tool_name_from_call(tool_call)
                    if name:
                        yield ("tool_start", name)
            elif isinstance(msg, ToolMessage):
                name = getattr(msg, "name", None)
                if isinstance(name, str) and name:
                    yield ("tool_end", name)
                else:
                    yield ("tool_end", "tool")


async def _stream_chat_events(
    graph: CompiledStateGraph,
    lc_messages: list[BaseMessage],
    *,
    runnable_config: RunnableConfig,
    http_client: httpx.AsyncClient,
) -> AsyncIterator[str]:
    token = chat_http_client_var.set(http_client)
    try:
        async for mode, chunk in graph.astream(
            {"messages": lc_messages},
            runnable_config,
            stream_mode=["messages", "updates"],
        ):
            if mode == "messages" and isinstance(chunk, tuple) and len(chunk) == 2:
                msg_chunk, _metadata = chunk
                text = _chunk_text(getattr(msg_chunk, "content", None))
                if text:
                    yield _sse_data_line({"token": text})
            elif mode == "updates":
                for status, tool_name in _tool_events_from_update(chunk):
                    yield _sse_data_line({"status": status, "tool": tool_name})
    except asyncio.CancelledError:
        raise
    except Exception as exc:
        yield _sse_data_line(structured_error_payload(exc))
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

    async def event_stream():
        try:
            async for line in _stream_chat_events(
                graph,
                [human],
                runnable_config=cfg,
                http_client=client,
            ):
                yield line
        except Exception as exc:
            yield _sse_data_line(structured_error_payload(exc))

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
