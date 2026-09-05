"""SSE streaming for chat ReAct (astream messages/updates → data lines)."""

from __future__ import annotations

import asyncio
import json
import uuid
from collections.abc import AsyncIterator, Iterator
from typing import Any

import httpx
from agents_app.agents.core.chat.http_context import chat_http_client_var
from agents_app.agents.core.chat.story_assets import apply_clear_story_assets
from agents_app.agents.errors import structured_error_payload
from langchain_core.messages import (
    AIMessage,
    AIMessageChunk,
    BaseMessage,
    ToolMessage,
)
from langchain_core.runnables import RunnableConfig
from langgraph.graph.state import CompiledStateGraph


def sse_data_line(payload: object) -> str:
    return f"data: {json.dumps(payload, ensure_ascii=False)}\n\n"


def chunk_text(content: object) -> str | None:
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


def _tool_call_args(tool_call: object) -> dict[str, Any]:
    if isinstance(tool_call, dict):
        args = tool_call.get("args")
        return args if isinstance(args, dict) else {}
    args = getattr(tool_call, "args", None)
    return args if isinstance(args, dict) else {}


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


def tool_events_from_update(
    update: object,
) -> Iterator[tuple[str, str, str | None, str | None, dict[str, Any] | None]]:
    """Yield (tool_start|tool_end, tool_name, output, tool_call_id, tool_input).

    ``tool_input`` is the model tool-call args on ``tool_start`` (for generative UI);
    ``None`` on ``tool_end``.
    """
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
                        yield (
                            "tool_start",
                            name,
                            None,
                            _tool_call_id_from_call(tool_call),
                            _tool_call_args(tool_call),
                        )
            elif isinstance(msg, ToolMessage):
                name = getattr(msg, "name", None)
                tool_name = name if isinstance(name, str) and name else "tool"
                raw_id = getattr(msg, "tool_call_id", None)
                tool_call_id = (
                    raw_id.strip() if isinstance(raw_id, str) and raw_id.strip() else None
                )
                yield ("tool_end", tool_name, _tool_message_output(msg), tool_call_id, None)


def _is_assistant_stream_chunk(msg_chunk: object) -> bool:
    """Only assistant message chunks may be forwarded as user-visible tokens."""
    return isinstance(msg_chunk, (AIMessage, AIMessageChunk))


async def stream_story_asset_action(
    graph: CompiledStateGraph,
    *,
    clear_name: str,
    runnable_config: RunnableConfig,
) -> AsyncIterator[str]:
    """Clear one scratchpad asset in the checkpoint without running the LLM."""
    tool_call_id = f"story-asset-{uuid.uuid4().hex[:12]}"
    try:
        yield sse_data_line(
            {
                "status": "tool_start",
                "tool": "clear_story_assets",
                "tool_call_id": tool_call_id,
            }
        )
        snapshot = await graph.aget_state(runnable_config)
        values = snapshot.values if isinstance(snapshot.values, dict) else {}
        current = values.get("story_assets")
        next_list, _message, payload = apply_clear_story_assets(current, name=clear_name)
        if next_list is None:
            yield sse_data_line(
                {
                    "status": "tool_end",
                    "tool": "clear_story_assets",
                    "tool_call_id": tool_call_id,
                    "output": payload,
                }
            )
            return
        await graph.aupdate_state(runnable_config, {"story_assets": next_list})
        yield sse_data_line(
            {
                "status": "tool_end",
                "tool": "clear_story_assets",
                "tool_call_id": tool_call_id,
                "output": payload,
            }
        )
    except asyncio.CancelledError:
        raise
    except Exception as exc:
        yield sse_data_line(structured_error_payload(exc))


async def stream_chat_events(
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
                text = chunk_text(getattr(msg_chunk, "content", None))
                if text:
                    yield sse_data_line({"token": text})
            elif mode == "updates":
                for status, tool_name, output, tool_call_id, tool_input in tool_events_from_update(
                    chunk
                ):
                    payload: dict[str, Any] = {"status": status, "tool": tool_name}
                    if tool_call_id:
                        payload["tool_call_id"] = tool_call_id
                    if status == "tool_start" and tool_input is not None:
                        payload["input"] = tool_input
                    if status == "tool_end" and output is not None:
                        payload["output"] = output
                    yield sse_data_line(payload)
    except asyncio.CancelledError:
        raise
    except Exception as exc:
        yield sse_data_line(structured_error_payload(exc))
    finally:
        chat_http_client_var.reset(token)
