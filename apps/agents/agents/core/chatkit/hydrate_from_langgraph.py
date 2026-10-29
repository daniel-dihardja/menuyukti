"""Seed ChatKit thread items from LangGraph checkpoint messages when the store is empty."""

from __future__ import annotations

import logging
from datetime import UTC, datetime, timedelta
from typing import Any

from agents_app.agents.core.chat.chat_run_config import resolve_thread_id, runnable_config
from agents_app.agents.core.chatkit.context import ChatKitRequestContext
from chatkit.types import (
    AssistantMessageContent,
    AssistantMessageItem,
    InferenceOptions,
    ThreadItem,
    UserMessageItem,
    UserMessageTextContent,
)
from langchain_core.messages import AIMessage, BaseMessage, HumanMessage

_logger = logging.getLogger(__name__)


def _text_from_content(content: object) -> str:
    if isinstance(content, str):
        return content.strip()
    if isinstance(content, list):
        parts: list[str] = []
        for block in content:
            if isinstance(block, str):
                parts.append(block)
            elif isinstance(block, dict) and block.get("type") == "text":
                text = block.get("text")
                if isinstance(text, str) and text:
                    parts.append(text)
        return "".join(parts).strip()
    return ""


def _message_id(msg: BaseMessage, fallback: str) -> str:
    raw = getattr(msg, "id", None)
    if isinstance(raw, str) and raw.strip():
        return raw.strip()
    return fallback


def langchain_messages_to_chatkit_items(
    messages: list[BaseMessage],
    *,
    thread_id: str,
    generate_item_id: Any | None = None,
) -> list[ThreadItem]:
    """Convert checkpoint LC messages into ChatKit user/assistant items (chronological)."""
    items: list[ThreadItem] = []
    base = datetime.now(UTC) - timedelta(seconds=max(len(messages), 1))
    for index, msg in enumerate(messages):
        created = base + timedelta(milliseconds=index)
        if isinstance(msg, HumanMessage):
            text = _text_from_content(msg.content)
            if not text:
                continue
            item_id = (
                generate_item_id("message")
                if callable(generate_item_id)
                else _message_id(msg, f"msg_hydrate_u_{index}")
            )
            items.append(
                UserMessageItem(
                    id=item_id,
                    thread_id=thread_id,
                    created_at=created,
                    content=[UserMessageTextContent(text=text)],
                    inference_options=InferenceOptions(),
                )
            )
            continue
        if isinstance(msg, AIMessage):
            text = _text_from_content(msg.content)
            if not text and not (msg.tool_calls or []):
                continue
            # Skip pure tool-call turns with no visible text (widgets handled live only).
            if not text:
                continue
            item_id = (
                generate_item_id("message")
                if callable(generate_item_id)
                else _message_id(msg, f"msg_hydrate_a_{index}")
            )
            items.append(
                AssistantMessageItem(
                    id=item_id,
                    thread_id=thread_id,
                    created_at=created,
                    content=[AssistantMessageContent(text=text)],
                )
            )
    return items


async def load_langgraph_messages_for_agent_thread(
    context: ChatKitRequestContext,
    *,
    agent_thread_id: str,
) -> list[BaseMessage]:
    """Return checkpoint messages for this advisor thread, or ``[]`` if unavailable."""
    graph = context.graph
    if graph is None:
        return []
    try:
        lg_thread_id = resolve_thread_id(context.user_id, agent_thread_id)
        cfg = runnable_config(
            thread_id=lg_thread_id,
            location_id=context.location_id,
            user_id=context.user_id,
            chat_gateway_model=None,
            agent_thread_id=agent_thread_id,
        )
        snapshot = await graph.aget_state(cfg)
    except Exception:  # noqa: BLE001 — hydrate is best-effort
        _logger.warning("ChatKit LangGraph hydrate: aget_state failed", exc_info=True)
        return []

    values = snapshot.values if isinstance(getattr(snapshot, "values", None), dict) else {}
    raw = values.get("messages")
    if not isinstance(raw, list):
        return []
    return [m for m in raw if isinstance(m, BaseMessage)]
