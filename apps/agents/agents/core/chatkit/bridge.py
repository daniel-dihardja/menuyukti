"""Map LangGraph astream chunks to ChatKit ThreadStreamEvents."""

from __future__ import annotations

import json
from collections.abc import AsyncIterator, Callable
from datetime import UTC, datetime

import httpx
from agents_app.agents.core.chat.http_context import chat_http_client_var
from agents_app.agents.core.chat.sse_stream import (
    chunk_text,
    tool_events_from_update,
)
from agents_app.agents.core.chatkit.widget_stream import emit_widget_done
from agents_app.agents.core.chatkit.widgets import story_confirm_widget, weekly_schedule_widget
from agents_app.agents.errors import structured_error_payload
from chatkit.types import (
    AssistantMessageContent,
    AssistantMessageContentPartAdded,
    AssistantMessageContentPartDone,
    AssistantMessageContentPartTextDelta,
    AssistantMessageItem,
    ClientEffectEvent,
    ErrorCode,
    ErrorEvent,
    ProgressUpdateEvent,
    ThreadItemAddedEvent,
    ThreadItemDoneEvent,
    ThreadItemUpdatedEvent,
    ThreadMetadata,
    ThreadStreamEvent,
)
from langchain_core.messages import AIMessage, AIMessageChunk, BaseMessage
from langchain_core.runnables import RunnableConfig
from langgraph.graph.state import CompiledStateGraph


def _utcnow() -> datetime:
    return datetime.now(UTC)


def _image_url_from_tool_output(output: object) -> str | None:
    """Extract a generated image URL from tool JSON or a plain https string."""
    if isinstance(output, str):
        text = output.strip()
        if text.startswith("http://") or text.startswith("https://"):
            return text
        try:
            parsed = json.loads(text)
        except json.JSONDecodeError:
            return None
        if isinstance(parsed, dict):
            url = parsed.get("url")
            return url.strip() if isinstance(url, str) and url.strip() else None
    if isinstance(output, dict):
        url = output.get("url")
        return url.strip() if isinstance(url, str) and url.strip() else None
    return None


async def stream_langgraph_as_chatkit(
    graph: CompiledStateGraph,
    lc_messages: list[BaseMessage],
    *,
    thread: ThreadMetadata,
    item_id: str,
    runnable_config: RunnableConfig,
    http_client: httpx.AsyncClient,
    generate_id: Callable[[str], str] | None = None,
) -> AsyncIterator[ThreadStreamEvent]:
    """Run the chat graph and yield ChatKit assistant message + progress/widget events."""
    content_index = 0
    text_parts: list[str] = []
    message_started = False
    token = chat_http_client_var.set(http_client)

    def _gen_id(item_type: str) -> str:
        if generate_id is not None:
            return generate_id(item_type)
        return f"{item_type}_{_utcnow().timestamp()}"

    try:
        async for mode, chunk in graph.astream(
            {"messages": lc_messages},
            runnable_config,
            stream_mode=["messages", "updates"],
        ):
            if mode == "messages" and isinstance(chunk, tuple) and len(chunk) == 2:
                msg_chunk, _metadata = chunk
                if not isinstance(msg_chunk, (AIMessage, AIMessageChunk)):
                    continue
                text = chunk_text(getattr(msg_chunk, "content", None))
                if not text:
                    continue
                if not message_started:
                    message_started = True
                    yield ThreadItemAddedEvent(
                        item=AssistantMessageItem(
                            id=item_id,
                            thread_id=thread.id,
                            created_at=_utcnow(),
                            content=[AssistantMessageContent(text="")],
                        )
                    )
                    yield ThreadItemUpdatedEvent(
                        item_id=item_id,
                        update=AssistantMessageContentPartAdded(
                            content_index=content_index,
                            content=AssistantMessageContent(text=""),
                        ),
                    )
                text_parts.append(text)
                yield ThreadItemUpdatedEvent(
                    item_id=item_id,
                    update=AssistantMessageContentPartTextDelta(
                        content_index=content_index,
                        delta=text,
                    ),
                )
            elif mode == "updates":
                for status, tool_name, output, _tool_call_id, tool_input in tool_events_from_update(
                    chunk
                ):
                    if status == "tool_start":
                        label = tool_name.replace("_", " ")
                        detail = ""
                        if isinstance(tool_input, dict) and tool_input:
                            detail = f" ({', '.join(list(tool_input.keys())[:3])})"
                        yield ProgressUpdateEvent(
                            text=f"Running {label}{detail}…",
                            icon="bolt",
                        )
                    elif status == "tool_end":
                        yield ProgressUpdateEvent(
                            text=f"Finished {tool_name.replace('_', ' ')}",
                            icon="check",
                        )
                        if tool_name == "request_story_generate_confirmation":
                            msg = (
                                output
                                if isinstance(output, str) and output.strip()
                                else "Ready to generate your story image?"
                            )
                            async for widget_event in emit_widget_done(
                                thread,
                                story_confirm_widget(message=msg),
                                generate_id=_gen_id,
                            ):
                                yield widget_event
                        elif tool_name == "present_weekly_instagram_schedule" and output:
                            async for widget_event in emit_widget_done(
                                thread,
                                weekly_schedule_widget(output),
                                generate_id=_gen_id,
                            ):
                                yield widget_event
                        elif tool_name == "generate_instagram_post_image":
                            image_url = _image_url_from_tool_output(output)
                            if image_url:
                                yield ClientEffectEvent(
                                    name="story_image_ready",
                                    data={"url": image_url},
                                )

        full_text = "".join(text_parts)
        if message_started:
            yield ThreadItemUpdatedEvent(
                item_id=item_id,
                update=AssistantMessageContentPartDone(
                    content_index=content_index,
                    content=AssistantMessageContent(text=full_text),
                ),
            )
            yield ThreadItemDoneEvent(
                item=AssistantMessageItem(
                    id=item_id,
                    thread_id=thread.id,
                    created_at=_utcnow(),
                    content=[AssistantMessageContent(text=full_text)],
                )
            )
        else:
            yield ThreadItemDoneEvent(
                item=AssistantMessageItem(
                    id=item_id,
                    thread_id=thread.id,
                    created_at=_utcnow(),
                    content=[AssistantMessageContent(text=full_text)],
                )
            )
    except Exception as exc:
        payload = structured_error_payload(exc)
        message = payload.get("message") if isinstance(payload, dict) else None
        yield ErrorEvent(
            code=ErrorCode.STREAM_ERROR,
            message=str(message or exc),
            allow_retry=True,
        )
    finally:
        chat_http_client_var.reset(token)
