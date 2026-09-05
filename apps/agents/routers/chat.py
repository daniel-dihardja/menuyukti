"""Streaming chat HTTP endpoint."""

from typing import Annotated, Any, Literal, Self

import httpx
from agents_app.agents.core.chat.chat_run_config import (
    resolve_thread_id,
    resolved_chat_gateway_model,
    runnable_config,
)
from agents_app.agents.core.chat.graph import incremental_user_message
from agents_app.agents.core.chat.history_messages import (
    langchain_messages_to_ui_messages,
    normalize_story_assets,
)
from agents_app.agents.core.chat.sse_stream import (
    sse_data_line,
    stream_chat_events,
    stream_story_asset_action,
)
from agents_app.agents.core.chat.story_assets import is_safe_photo_filename
from agents_app.agents.errors import structured_error_payload
from agents_app.deps import get_http_client
from fastapi import APIRouter, Depends, Header, HTTPException, Query, Request
from fastapi.responses import StreamingResponse
from langchain_core.messages import HumanMessage
from pydantic import BaseModel, ConfigDict, Field, model_validator
from starlette.responses import JSONResponse

router = APIRouter()


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


class StoryAssetAction(BaseModel):
    """Client-driven scratchpad mutation (no LLM)."""

    op: Literal["clear"]
    name: str = Field(min_length=1)

    @model_validator(mode="after")
    def _validate_name(self) -> Self:
        if not is_safe_photo_filename(self.name):
            raise ValueError("story_asset_action.name must be a safe media-library filename")
        return self


class ChatRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    messages: list[ChatMessage] = Field(default_factory=list)
    location_id: int | None = Field(default=None, ge=1)
    analytics_run_id: int | None = Field(default=None, ge=1)
    agent_thread_id: str = Field(min_length=1)
    chat_mode: Literal["general", "image_assistant", "story_image_assistant"] | None = Field(
        default=None,
        description=(
            "Opt-in chat mode; branches system prompt and tools "
            "(image_assistant = Instagram image direction gathering; "
            "story_image_assistant is a legacy alias)."
        ),
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
    story_asset_action: StoryAssetAction | None = None

    @model_validator(mode="after")
    def _require_messages_or_action(self) -> Self:
        if self.story_asset_action is not None:
            return self
        if len(self.messages) != 1:
            raise ValueError("Expected exactly one user message per request")
        return self


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

    action_only = body.story_asset_action is not None and len(body.messages) == 0
    human: HumanMessage | None = None
    if not action_only:
        try:
            human = incremental_user_message([m.model_dump() for m in body.messages])
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e)) from e

    thread_id = resolve_thread_id(x_menuyukti_user_id, body.agent_thread_id)
    gateway_model = resolved_chat_gateway_model(body.chat_model)

    cfg = runnable_config(
        thread_id=thread_id,
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
        agent_thread_id=body.agent_thread_id,
    )

    async def event_stream():
        try:
            if action_only and body.story_asset_action is not None:
                async for line in stream_story_asset_action(
                    graph,
                    clear_name=body.story_asset_action.name,
                    runnable_config=cfg,
                ):
                    yield line
                return
            assert human is not None
            async for line in stream_chat_events(
                graph,
                [human],
                runnable_config=cfg,
                http_client=client,
            ):
                yield line
        except Exception as exc:
            yield sse_data_line(structured_error_payload(exc))

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/chat/history")
async def chat_history(
    request: Request,
    agent_thread_id: Annotated[str | None, Query()] = None,
    x_menuyukti_user_id: Annotated[str | None, Header(alias="X-Menuyukti-User-Id")] = None,
) -> JSONResponse:
    """Return checkpoint messages as UIMessage-shaped DTOs for UI hydrate."""
    graph = getattr(request.app.state, "chat_graph", None)
    if graph is None:
        raise HTTPException(status_code=503, detail="Chat graph is not initialized")

    if agent_thread_id is not None and not agent_thread_id.strip():
        agent_thread_id = None

    thread_id = resolve_thread_id(x_menuyukti_user_id, agent_thread_id)
    cfg = runnable_config(
        thread_id=thread_id,
        location_id=None,
        user_id=x_menuyukti_user_id,
        chat_gateway_model=None,
        agent_thread_id=agent_thread_id,
    )

    snapshot = await graph.aget_state(cfg)
    values = snapshot.values if isinstance(getattr(snapshot, "values", None), dict) else {}
    raw_messages = values.get("messages")
    messages_list = raw_messages if isinstance(raw_messages, list) else []
    ui_messages = langchain_messages_to_ui_messages(messages_list)
    story_assets = normalize_story_assets(values.get("story_assets"))

    return JSONResponse(
        {
            "thread_id": thread_id,
            "messages": ui_messages,
            "story_assets": story_assets,
        }
    )


@router.delete("/chat/history")
async def delete_chat_history(
    request: Request,
    agent_thread_id: Annotated[str | None, Query()] = None,
    x_menuyukti_user_id: Annotated[str | None, Header(alias="X-Menuyukti-User-Id")] = None,
) -> JSONResponse:
    """Delete LangGraph checkpoints for one agent thread."""
    user_id = (x_menuyukti_user_id or "").strip()
    if not user_id:
        raise HTTPException(status_code=400, detail="X-Menuyukti-User-Id is required")

    if agent_thread_id is not None and not agent_thread_id.strip():
        agent_thread_id = None

    if not agent_thread_id:
        raise HTTPException(
            status_code=400,
            detail="agent_thread_id is required",
        )

    checkpointer = getattr(request.app.state, "chat_checkpointer", None)
    if checkpointer is None:
        raise HTTPException(status_code=503, detail="Chat checkpointer is not initialized")

    thread_id = f"{user_id}:agent:{agent_thread_id.strip()}"
    await checkpointer.adelete_thread(thread_id)
    return JSONResponse({"deleted_thread_ids": [thread_id], "count": 1})
