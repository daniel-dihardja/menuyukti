"""Streaming chat HTTP endpoint."""

import asyncio
import json
import re
from collections.abc import AsyncIterator, Iterator
from typing import Annotated, Any, Literal

import httpx
from agents_app.agents.core.chat.allowed_models import CHAT_GATEWAY_MODEL_ALLOWLIST
from agents_app.agents.core.chat.graph import CHAT_RECURSION_LIMIT, incremental_user_message
from agents_app.agents.core.chat.http_context import chat_http_client_var
from agents_app.agents.core.chat.tools import get_milestone
from agents_app.agents.errors import structured_error_payload
from agents_app.deps import get_http_client
from fastapi import APIRouter, Depends, Header, HTTPException, Request
from fastapi.responses import StreamingResponse
from langchain_core.messages import (
    AIMessage,
    AIMessageChunk,
    BaseMessage,
    HumanMessage,
    ToolMessage,
)
from langchain_core.runnables import RunnableConfig
from langgraph.graph.state import CompiledStateGraph
from pydantic import BaseModel, ConfigDict, Field

router = APIRouter()

_SLASH_PRESET_RE = re.compile(r"^/preset\s+(\d+)$")


class ChatTextContentBlock(BaseModel):
    type: Literal["text"]
    text: str = Field(min_length=1)


class ChatImageUrlObject(BaseModel):
    url: str = Field(min_length=1)


class ChatImageUrlContentBlock(BaseModel):
    type: Literal["image_url"]
    image_url: ChatImageUrlObject | str


ChatContentBlock = Annotated[
    ChatTextContentBlock | ChatImageUrlContentBlock,
    Field(discriminator="type"),
]


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str | list[ChatContentBlock] = Field(
        description="Plain text or OpenAI-style multimodal content blocks.",
    )

    def model_post_init(self, __context: Any) -> None:
        if isinstance(self.content, str) and not self.content.strip():
            raise ValueError("content must be a non-empty string or content block list")
        if isinstance(self.content, list) and len(self.content) == 0:
            raise ValueError("content must be a non-empty string or content block list")


class ChatRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    messages: list[ChatMessage] = Field(min_length=1)
    workflow_id: str | None = None
    milestone_id: str | None = None
    location_id: int | None = Field(default=None, ge=1)
    analytics_run_id: int | None = Field(default=None, ge=1)
    agent_thread_id: str | None = Field(default=None, min_length=1)
    workflow_chat_session_id: str | None = Field(default=None, min_length=1)
    chat_mode: Literal["general", "story_image_assistant"] | None = Field(
        default=None,
        description="Opt-in chat mode; stored on configurable for future prompt/tool branching.",
    )
    chat_model: str | None = Field(
        default=None,
        max_length=120,
        alias="model",
        description="Vercel AI Gateway id (provider/model); must be in the chat allowlist.",
    )
    post_id: str | None = Field(default=None, min_length=1)
    page_id: str | None = Field(default=None, min_length=1)
    generation_model: str | None = Field(default=None, min_length=1, max_length=120)
    image_format: str | None = Field(default=None, min_length=1, max_length=40)
    image_quality: str | None = Field(default=None, min_length=1, max_length=40)
    style_id: int | None = Field(default=None, ge=1)
    generation_references: list[dict[str, Any]] | None = None


def _sse_data_line(payload: object) -> str:
    return f"data: {json.dumps(payload, ensure_ascii=False)}\n\n"


def parse_slash_get_milestone(content: object) -> dict[str, Any] | None:
    """Map exact slash commands to ``get_milestone`` args; otherwise ``None``."""
    if not isinstance(content, str):
        return None
    text = content.strip()
    if text == "/input":
        return {"fields": ["input"]}
    if text == "/data":
        return {"fields": ["data"]}
    if text == "/help":
        return {"fields": ["help"]}
    match = _SLASH_PRESET_RE.fullmatch(text)
    if match is not None:
        return {"fields": ["data"], "milestone_id": match.group(1)}
    return None


async def _stream_slash_get_milestone(
    *,
    tool_args: dict[str, Any],
    runnable_config: RunnableConfig,
    http_client: httpx.AsyncClient,
) -> AsyncIterator[str]:
    """Invoke ``get_milestone`` without the LLM and emit chat SSE tool + token events."""
    token = chat_http_client_var.set(http_client)
    try:
        yield _sse_data_line({"status": "tool_start", "tool": "get_milestone"})
        output = await get_milestone.ainvoke(tool_args, config=runnable_config)
        text = output if isinstance(output, str) else str(output)
        yield _sse_data_line({"status": "tool_end", "tool": "get_milestone", "output": text})
        if text:
            yield _sse_data_line({"token": text})
    except asyncio.CancelledError:
        raise
    except Exception as exc:
        yield _sse_data_line(structured_error_payload(exc))
    finally:
        chat_http_client_var.reset(token)


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
    analytics_run_id: int | None = None,
    post_id: str | None = None,
    page_id: str | None = None,
    generation_model: str | None = None,
    image_format: str | None = None,
    image_quality: str | None = None,
    style_id: int | None = None,
    generation_references: list[dict[str, Any]] | None = None,
    chat_mode: str | None = None,
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
    if analytics_run_id is not None:
        configurable["analytics_run_id"] = analytics_run_id
    if post_id is not None:
        configurable["post_id"] = post_id
    if page_id is not None:
        configurable["page_id"] = page_id
    if generation_model is not None:
        configurable["generation_model"] = generation_model
    if image_format is not None:
        configurable["image_format"] = image_format
    if image_quality is not None:
        configurable["image_quality"] = image_quality
    if style_id is not None:
        configurable["style_id"] = style_id
    if generation_references is not None:
        configurable["generation_references"] = generation_references
    if chat_mode is not None:
        configurable["chat_mode"] = chat_mode
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


def _tool_call_id_from_call(tool_call: object) -> str | None:
    if isinstance(tool_call, dict):
        raw = tool_call.get("id")
        return raw.strip() if isinstance(raw, str) and raw.strip() else None
    raw = getattr(tool_call, "id", None)
    return raw.strip() if isinstance(raw, str) and raw.strip() else None


def _tool_message_output(msg: ToolMessage) -> str:
    content = getattr(msg, "content", None)
    if isinstance(content, str):
        return content
    if content is None:
        return ""
    try:
        return json.dumps(content, ensure_ascii=False)
    except (TypeError, ValueError):
        return str(content)


def _tool_events_from_update(
    update: object,
) -> Iterator[tuple[str, str, str | None, str | None]]:
    """Yield (tool_start|tool_end, tool_name, optional output, optional tool_call_id)."""
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
                        yield ("tool_start", name, None, _tool_call_id_from_call(tool_call))
            elif isinstance(msg, ToolMessage):
                name = getattr(msg, "name", None)
                tool_name = name if isinstance(name, str) and name else "tool"
                raw_id = getattr(msg, "tool_call_id", None)
                tool_call_id = (
                    raw_id.strip() if isinstance(raw_id, str) and raw_id.strip() else None
                )
                yield ("tool_end", tool_name, _tool_message_output(msg), tool_call_id)


def _is_assistant_stream_chunk(msg_chunk: object) -> bool:
    """Only assistant message chunks may be forwarded as user-visible tokens."""
    return isinstance(msg_chunk, (AIMessage, AIMessageChunk))


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
                if not _is_assistant_stream_chunk(msg_chunk):
                    continue
                text = _chunk_text(getattr(msg_chunk, "content", None))
                if text:
                    yield _sse_data_line({"token": text})
            elif mode == "updates":
                for status, tool_name, output, tool_call_id in _tool_events_from_update(chunk):
                    payload: dict[str, Any] = {"status": status, "tool": tool_name}
                    if tool_call_id:
                        payload["tool_call_id"] = tool_call_id
                    if status == "tool_end" and output is not None:
                        payload["output"] = output
                    yield _sse_data_line(payload)
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
        analytics_run_id=body.analytics_run_id,
        post_id=body.post_id,
        page_id=body.page_id,
        generation_model=body.generation_model,
        image_format=body.image_format,
        image_quality=body.image_quality,
        style_id=body.style_id,
        generation_references=body.generation_references,
        chat_mode=body.chat_mode,
    )

    slash_args = parse_slash_get_milestone(
        human.content if isinstance(human, HumanMessage) else None
    )

    async def event_stream():
        try:
            if slash_args is not None:
                async for line in _stream_slash_get_milestone(
                    tool_args=slash_args,
                    runnable_config=cfg,
                    http_client=client,
                ):
                    yield line
                return
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
