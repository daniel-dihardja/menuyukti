"""LangGraph → ChatKit hydrate for empty transcripts."""

from __future__ import annotations

from datetime import UTC, datetime
from unittest.mock import AsyncMock

import anyio
from agents_app.agents.core.chatkit.context import ChatKitRequestContext
from agents_app.agents.core.chatkit.hydrate_from_langgraph import (
    langchain_messages_to_chatkit_items,
)
from agents_app.agents.core.chatkit.hydrating_store import HydratingChatKitStore
from agents_app.agents.core.chatkit.memory_store import MemoryChatKitStore
from chatkit.types import AssistantMessageItem, ThreadMetadata, UserMessageItem
from langchain_core.messages import AIMessage, HumanMessage


def test_langchain_messages_to_chatkit_items_orders_user_then_assistant() -> None:
    items = langchain_messages_to_chatkit_items(
        [
            HumanMessage(content="hello", id="h1"),
            AIMessage(content="hi there", id="a1"),
        ],
        thread_id="thr",
    )
    assert len(items) == 2
    assert isinstance(items[0], UserMessageItem)
    assert isinstance(items[1], AssistantMessageItem)
    assert items[0].created_at < items[1].created_at
    assert items[0].content[0].text == "hello"
    assert items[1].content[0].text == "hi there"


def test_hydrating_store_seeds_from_langgraph_when_empty() -> None:
    inner = MemoryChatKitStore()
    store = HydratingChatKitStore(inner)
    agent_tid = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"
    ctx = ChatKitRequestContext(user_id="user-1", agent_thread_id=agent_tid)

    class _Snap:
        values = {
            "messages": [
                HumanMessage(content="ping", id="h1"),
                AIMessage(content="pong", id="a1"),
            ]
        }

    graph = AsyncMock()
    graph.aget_state = AsyncMock(return_value=_Snap())
    ctx.graph = graph

    async def _run() -> None:
        await store.save_thread(
            ThreadMetadata(id=agent_tid, created_at=datetime.now(UTC)),
            ctx,
        )
        page = await store.load_thread_items(agent_tid, None, 20, "asc", ctx)
        assert [type(i).__name__ for i in page.data] == [
            "UserMessageItem",
            "AssistantMessageItem",
        ]
        # Second load should not re-seed (already has items).
        graph.aget_state.reset_mock()
        page2 = await store.load_thread_items(agent_tid, None, 20, "asc", ctx)
        assert len(page2.data) == 2
        graph.aget_state.assert_not_called()

    anyio.run(_run)
