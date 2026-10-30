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
from agents_app.agents.core.chatkit.widget_stream import (
    emit_widget_added,
    emit_widget_done,
    emit_widget_root_updated,
)
from agents_app.agents.core.chatkit.widgets import (
    cogs_edit_form_widget,
    cogs_list_widget,
    generated_image_widget,
    story_confirm_widget,
    tool_status_widget,
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
        "get_location_data",
        "search_knowledge",
        "search_web",
        "save_story_asset",
        "clear_story_assets",
        "list_menu_item_cogs",
        "request_cogs_edit",
    }
)

_CHART_TITLES: dict[str, str] = {
    "venue_slot_strength_heatmap": "Venue slot strength",
    "menu_item_heatmap": "Menu item heatmap",
    "pair_lift_matrix_heatmap": "Pair lift matrix",
    "weak_review": "Weak items review",
}


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


def _cogs_list_widget_from_tool_output(output: object) -> Card | None:
    """Build a COGS list Card from ``list_menu_item_cogs`` JSON output."""
    obj = _parse_json_object(output)
    if obj is None or obj.get("ok") is not True:
        return None
    raw_items = obj.get("items")
    if not isinstance(raw_items, list):
        return None
    items = [row for row in raw_items if isinstance(row, dict)]
    summary = obj.get("summary")
    missing_count = 0
    total_count = len(items)
    run_name: str | None = None
    if isinstance(summary, dict):
        mc = summary.get("missing_count")
        if isinstance(mc, int) and mc >= 0:
            missing_count = mc
        else:
            missing_count = sum(1 for row in items if row.get("status") == "missing")
        tc = summary.get("total")
        if isinstance(tc, int) and tc >= 0:
            total_count = tc
        rn = summary.get("run_name")
        if isinstance(rn, str) and rn.strip():
            run_name = rn.strip()
    else:
        missing_count = sum(1 for row in items if row.get("status") == "missing")
    return cogs_list_widget(
        items,
        missing_count=missing_count,
        total_count=total_count,
        run_name=run_name,
    )


def _cogs_edit_form_widget_from_tool_output(output: object) -> Card | None:
    """Build a COGS edit Form Card from ``request_cogs_edit`` JSON output."""
    obj = _parse_json_object(output)
    if obj is None or obj.get("ok") is not True:
        return None
    if obj.get("action") != "request_cogs_edit":
        return None
    raw_items = obj.get("items")
    if not isinstance(raw_items, list) or not raw_items:
        return None
    items = [row for row in raw_items if isinstance(row, dict)]
    if not items:
        return None
    run_name: str | None = None
    rn = obj.get("run_name")
    if isinstance(rn, str) and rn.strip():
        run_name = rn.strip()
    truncated = obj.get("truncated") is True
    return cogs_edit_form_widget(items, run_name=run_name, truncated=truncated)


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


def _chart_id_from_input(tool_input: object) -> str | None:
    if not isinstance(tool_input, dict):
        return None
    raw = tool_input.get("chart_id") or tool_input.get("chartId")
    if isinstance(raw, str) and raw.strip():
        return raw.strip()
    return None


def _chart_id_from_output(output: object) -> str | None:
    """Recover chart id from markdown when tool_end has no input args."""
    if not isinstance(output, str):
        return None
    for chart_id, title in _CHART_TITLES.items():
        if f"## Visualization data — {title}" in output:
            return chart_id
    return None


def _resolve_chart_id(tool_input: object, output: object | None = None) -> str | None:
    return _chart_id_from_input(tool_input) or (
        _chart_id_from_output(output) if output is not None else None
    )


def _chart_status_detail(tool_input: object, output: object) -> tuple[str, str | None]:
    chart_id = _resolve_chart_id(tool_input, output)
    if _tool_output_looks_like_error(output):
        title = (
            f"Could not load {_CHART_TITLES[chart_id]}"
            if chart_id and chart_id in _CHART_TITLES
            else "Could not load chart"
        )
        return (title, chart_id)
    if chart_id and chart_id in _CHART_TITLES:
        return (f"Loaded {_CHART_TITLES[chart_id]}", chart_id)
    return ("Chart data ready", chart_id)


def _progress_for_tool_start(
    tool_name: str, tool_input: object
) -> tuple[str, str]:
    """Return (progress text, icon) shown while a tool runs."""
    if tool_name == "get_chart_data":
        chart_id = _chart_id_from_input(tool_input)
        if chart_id and chart_id in _CHART_TITLES:
            return (f"Loading {_CHART_TITLES[chart_id]}…", "chart")
        return ("Loading chart data…", "chart")
    if tool_name == "get_location_data":
        return ("Loading location context…", "map-pin")
    if tool_name == "search_knowledge":
        return ("Searching knowledge…", "book-open")
    if tool_name == "search_web":
        return ("Searching the web…", "globe")
    if tool_name == "save_story_asset":
        return ("Saving story asset…", "images")
    if tool_name == "clear_story_assets":
        return ("Clearing story assets…", "images")
    if tool_name == "generate_instagram_post_image":
        return ("Generating post image…", "images")
    if tool_name == "list_media" or tool_name == "list_media_collections":
        return ("Checking media library…", "images")
    if tool_name == "get_inventory_refill_forecast":
        return ("Loading refill forecast…", "analytics")
    if tool_name == "list_menu_item_cogs":
        return ("Loading menu COGS…", "analytics")
    if tool_name == "request_cogs_edit":
        return ("Preparing COGS edit form…", "analytics")
    label = tool_name.replace("_", " ")
    return (f"Running {label}…", "bolt")


def _progress_for_tool_end(
    tool_name: str, *, tool_input: object, output: object
) -> str:
    """Short progress line when a tool finishes (ephemeral ChatKit status)."""
    if tool_name == "get_chart_data":
        title, _detail = _chart_status_detail(tool_input, output)
        return title
    if tool_name == "get_location_data":
        return (
            "Could not load location"
            if _tool_output_looks_like_error(output)
            else "Loaded location context"
        )
    if tool_name == "search_knowledge":
        return (
            "Knowledge search failed"
            if _tool_output_looks_like_error(output)
            else "Knowledge search complete"
        )
    if tool_name == "search_web":
        return (
            "Web search failed"
            if _tool_output_looks_like_error(output)
            else "Web search complete"
        )
    if tool_name == "save_story_asset":
        return (
            "Could not save asset"
            if _tool_output_looks_like_error(output)
            else "Story asset saved"
        )
    if tool_name == "clear_story_assets":
        return (
            "Could not clear assets"
            if _tool_output_looks_like_error(output)
            else "Story assets cleared"
        )
    if tool_name == "generate_instagram_post_image":
        return (
            "Image generation failed"
            if _tool_output_looks_like_error(output)
            else "Generated post image"
        )
    if tool_name == "list_media" or tool_name == "list_media_collections":
        return "Media library ready"
    if tool_name == "get_inventory_refill_forecast":
        return "Refill forecast ready"
    if tool_name == "list_menu_item_cogs":
        return (
            "Could not load menu COGS"
            if _tool_output_looks_like_error(output)
            else "Loaded menu COGS"
        )
    if tool_name == "request_cogs_edit":
        return (
            "Could not open COGS edit form"
            if _tool_output_looks_like_error(output)
            else "COGS edit form ready"
        )
    return f"Finished {tool_name.replace('_', ' ')}"


def _running_status_for_tool(tool_name: str, tool_input: object) -> Card | None:
    """Durable in-flight status card (updated to done/error when the tool ends)."""
    if tool_name not in _COMPACT_STATUS_TOOLS:
        return None
    if tool_name == "get_chart_data":
        chart_id = _chart_id_from_input(tool_input)
        if chart_id and chart_id in _CHART_TITLES:
            return tool_status_widget(
                title=f"Loading {_CHART_TITLES[chart_id]}…",
                detail=chart_id,
                tone="info",
            )
        return tool_status_widget(title="Loading chart data…", tone="info")
    if tool_name == "get_location_data":
        return tool_status_widget(title="Loading location context…", tone="info")
    if tool_name == "search_knowledge":
        return tool_status_widget(title="Searching knowledge…", tone="info")
    if tool_name == "search_web":
        return tool_status_widget(title="Searching the web…", tone="info")
    if tool_name == "save_story_asset":
        return tool_status_widget(title="Saving story asset…", tone="info")
    if tool_name == "clear_story_assets":
        return tool_status_widget(title="Clearing story assets…", tone="info")
    if tool_name == "list_menu_item_cogs":
        return tool_status_widget(title="Loading menu COGS…", tone="info")
    if tool_name == "request_cogs_edit":
        return tool_status_widget(title="Preparing COGS edit form…", tone="info")
    return None


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
    if tool_name == "get_location_data":
        return tool_status_widget(
            title="Could not load location" if is_err else "Loaded location context",
            tone=tone,
        )
    if tool_name == "search_knowledge":
        return tool_status_widget(
            title="Knowledge search failed" if is_err else "Knowledge search complete",
            tone=tone,
        )
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
    if tool_name == "list_menu_item_cogs":
        return tool_status_widget(
            title="Could not load menu COGS" if is_err else "Loaded menu COGS",
            tone=tone,
        )
    if tool_name == "request_cogs_edit":
        return tool_status_widget(
            title=(
                "Could not open COGS edit form" if is_err else "COGS edit form ready"
            ),
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
    # tool_end events omit args — keep start inputs so done hints stay chart-specific
    pending_tool_inputs_by_id: dict[str, object] = {}
    pending_tool_inputs_by_name: dict[str, list[object]] = {}
    pending_status_widget_ids: dict[str, str] = {}
    pending_status_widget_ids_by_name: dict[str, list[str]] = {}
    token = chat_http_client_var.set(http_client)

    def _gen_id(item_type: str) -> str:
        if generate_id is not None:
            return generate_id(item_type)
        return f"{item_type}_{_utcnow().timestamp()}"

    def _remember_tool_input(tool_name: str, tool_call_id: str | None, tool_input: object) -> None:
        if tool_call_id:
            pending_tool_inputs_by_id[tool_call_id] = tool_input
        pending_tool_inputs_by_name.setdefault(tool_name, []).append(tool_input)

    def _take_tool_input(
        tool_name: str, tool_call_id: str | None
    ) -> object:
        if tool_call_id and tool_call_id in pending_tool_inputs_by_id:
            remembered = pending_tool_inputs_by_id.pop(tool_call_id)
            fifo = pending_tool_inputs_by_name.get(tool_name) or []
            if remembered in fifo:
                fifo.remove(remembered)
            return remembered
        fifo = pending_tool_inputs_by_name.get(tool_name) or []
        if fifo:
            return fifo.pop(0)
        return None

    def _remember_status_widget(
        tool_name: str, tool_call_id: str | None, widget_item_id: str
    ) -> None:
        if tool_call_id:
            pending_status_widget_ids[tool_call_id] = widget_item_id
        pending_status_widget_ids_by_name.setdefault(tool_name, []).append(widget_item_id)

    def _take_status_widget_id(tool_name: str, tool_call_id: str | None) -> str | None:
        if tool_call_id and tool_call_id in pending_status_widget_ids:
            widget_item_id = pending_status_widget_ids.pop(tool_call_id)
            fifo = pending_status_widget_ids_by_name.get(tool_name) or []
            if widget_item_id in fifo:
                fifo.remove(widget_item_id)
            return widget_item_id
        fifo = pending_status_widget_ids_by_name.get(tool_name) or []
        if fifo:
            return fifo.pop(0)
        return None

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
                for status, tool_name, output, tool_call_id, tool_input in tool_events_from_update(
                    chunk
                ):
                    if status == "tool_start":
                        _remember_tool_input(tool_name, tool_call_id, tool_input)
                        progress_text, progress_icon = _progress_for_tool_start(
                            tool_name, tool_input
                        )
                        yield ProgressUpdateEvent(
                            text=progress_text,
                            icon=progress_icon,  # type: ignore[arg-type]
                        )
                        running_widget = _running_status_for_tool(tool_name, tool_input)
                        if running_widget is not None:
                            widget_item_id = _gen_id("message")
                            _remember_status_widget(
                                tool_name, tool_call_id, widget_item_id
                            )
                            async for widget_event in emit_widget_added(
                                thread,
                                running_widget,
                                item_id=widget_item_id,
                            ):
                                yield widget_event
                    elif status == "tool_end":
                        resolved_input = _take_tool_input(tool_name, tool_call_id)
                        if resolved_input is None:
                            resolved_input = tool_input
                        yield ProgressUpdateEvent(
                            text=_progress_for_tool_end(
                                tool_name,
                                tool_input=resolved_input,
                                output=output,
                            ),
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
                        elif tool_name == "list_menu_item_cogs":
                            status_widget = _compact_status_for_tool(
                                tool_name,
                                output=output,
                                tool_input=resolved_input,
                            )
                            if status_widget is not None:
                                existing_id = _take_status_widget_id(
                                    tool_name, tool_call_id
                                )
                                if existing_id is not None:
                                    async for widget_event in emit_widget_root_updated(
                                        item_id=existing_id,
                                        thread=thread,
                                        widget=status_widget,
                                    ):
                                        yield widget_event
                                else:
                                    async for widget_event in emit_widget_done(
                                        thread,
                                        status_widget,
                                        generate_id=_gen_id,
                                    ):
                                        yield widget_event
                            list_widget = _cogs_list_widget_from_tool_output(output)
                            if list_widget is not None:
                                async for widget_event in emit_widget_done(
                                    thread,
                                    list_widget,
                                    generate_id=_gen_id,
                                ):
                                    yield widget_event
                        elif tool_name == "request_cogs_edit":
                            status_widget = _compact_status_for_tool(
                                tool_name,
                                output=output,
                                tool_input=resolved_input,
                            )
                            if status_widget is not None:
                                existing_id = _take_status_widget_id(
                                    tool_name, tool_call_id
                                )
                                if existing_id is not None:
                                    async for widget_event in emit_widget_root_updated(
                                        item_id=existing_id,
                                        thread=thread,
                                        widget=status_widget,
                                    ):
                                        yield widget_event
                                else:
                                    async for widget_event in emit_widget_done(
                                        thread,
                                        status_widget,
                                        generate_id=_gen_id,
                                    ):
                                        yield widget_event
                            edit_widget = _cogs_edit_form_widget_from_tool_output(
                                output
                            )
                            if edit_widget is not None:
                                async for widget_event in emit_widget_done(
                                    thread,
                                    edit_widget,
                                    generate_id=_gen_id,
                                ):
                                    yield widget_event
                        elif tool_name in _COMPACT_STATUS_TOOLS:
                            status_widget = _compact_status_for_tool(
                                tool_name,
                                output=output,
                                tool_input=resolved_input,
                            )
                            if status_widget is not None:
                                existing_id = _take_status_widget_id(
                                    tool_name, tool_call_id
                                )
                                if existing_id is not None:
                                    async for widget_event in emit_widget_root_updated(
                                        item_id=existing_id,
                                        thread=thread,
                                        widget=status_widget,
                                    ):
                                        yield widget_event
                                else:
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
