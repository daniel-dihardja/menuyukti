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
from agents_app.agents.core.chatkit.widgets import (
    generated_image_widget,
    story_confirm_widget,
    tool_status_widget,
    weekly_schedule_widget,
)
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
from chatkit.widgets import Card
from langchain_core.messages import AIMessage, AIMessageChunk, BaseMessage
from langchain_core.runnables import RunnableConfig
from langgraph.graph.state import CompiledStateGraph

_COMPACT_STATUS_TOOLS = frozenset(
    {
        "get_chart_data",
        "search_web",
        "save_story_asset",
        "clear_story_assets",
    }
)


def _utcnow() -> datetime:
    return datetime.now(UTC)


def _parse_json_object(output: object) -> dict[str, object] | None:
    if isinstance(output, dict):
        return output  # type: ignore[return-value]
    if isinstance(output, str):
        text = output.strip()
        if not text:
            return None
        try:
            parsed = json.loads(text)
        except json.JSONDecodeError:
            return None
        return parsed if isinstance(parsed, dict) else None
    return None


def _image_url_from_tool_output(output: object) -> str | None:
    """Extract a generated image URL from tool JSON or a plain https string."""
    if isinstance(output, str):
        text = output.strip()
        if text.startswith("http://") or text.startswith("https://"):
            return text
    obj = _parse_json_object(output)
    if obj is None:
        return None
    url = obj.get("url")
    return url.strip() if isinstance(url, str) and url.strip() else None


def _is_rejected_story_asset_save(output: object) -> bool:
    """Match web `isRejectedStoryAssetSaveOutput` — hide speculative failed saves."""
    obj = _parse_json_object(output)
    if obj is None:
        return False
    return obj.get("ok") is False and obj.get("action") == "save"


def _tool_output_looks_like_error(output: object) -> bool:
    if output is None:
        return False
    if isinstance(output, str):
        lower = output.strip().lower()
        return lower.startswith("error:") or lower.startswith("error ")
    obj = _parse_json_object(output)
    if obj is None:
        return False
    if obj.get("ok") is False:
        return True
    err = obj.get("error")
    return isinstance(err, str) and bool(err.strip())


def _chart_status_detail(tool_input: object, output: object) -> tuple[str, str | None]:
    chart_id = None
    if isinstance(tool_input, dict):
        raw = tool_input.get("chart_id") or tool_input.get("chartId")
        if isinstance(raw, str) and raw.strip():
            chart_id = raw.strip()
    titles = {
        "venue_slot_strength_heatmap": "Venue slot strength",
        "menu_item_heatmap": "Menu item heatmap",
        "pair_lift_matrix_heatmap": "Pair lift matrix",
        "low_end_review": "Weak items review",
    }
    if _tool_output_looks_like_error(output):
        return ("Could not load chart", chart_id)
    if chart_id and chart_id in titles:
        return (f"Loaded {titles[chart_id]}", chart_id)
    return ("Chart data ready", chart_id)


def _compact_status_for_tool(
    tool_name: str,
    *,
    output: object,
    tool_input: object,
) -> Card | None:
    if tool_name == "save_story_asset" and _is_rejected_story_asset_save(output):
        return None
    is_err = _tool_output_looks_like_error(output)
    tone = "error" if is_err else "ok"
    if tool_name == "get_chart_data":
        title, detail = _chart_status_detail(tool_input, output)
        return tool_status_widget(title=title, detail=detail, tone=tone)
    if tool_name == "search_web":
        return tool_status_widget(
            title="Web search failed" if is_err else "Web search complete",
            tone=tone,
        )
    if tool_name == "save_story_asset":
        return tool_status_widget(
            title="Could not save asset" if is_err else "Story asset saved",
            tone=tone,
        )
    if tool_name == "clear_story_assets":
        return tool_status_widget(
            title="Could not clear assets" if is_err else "Story assets cleared",
            tone=tone,
        )
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
                                async for widget_event in emit_widget_done(
                                    thread,
                                    generated_image_widget(url=image_url),
                                    generate_id=_gen_id,
                                ):
                                    yield widget_event
                            elif _tool_output_looks_like_error(output):
                                async for widget_event in emit_widget_done(
                                    thread,
                                    tool_status_widget(
                                        title="Image generation failed",
                                        tone="error",
                                    ),
                                    generate_id=_gen_id,
                                ):
                                    yield widget_event
                        elif tool_name in _COMPACT_STATUS_TOOLS:
                            status_widget = _compact_status_for_tool(
                                tool_name,
                                output=output,
                                tool_input=tool_input,
                            )
                            if status_widget is not None:
                                async for widget_event in emit_widget_done(
                                    thread,
                                    status_widget,
                                    generate_id=_gen_id,
                                ):
                                    yield widget_event

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
