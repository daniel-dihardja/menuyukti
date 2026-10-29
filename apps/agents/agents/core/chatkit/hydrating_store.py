"""ChatKit Store wrapper that seeds empty threads from LangGraph checkpoints."""

from __future__ import annotations

import logging
from typing import Any

from agents_app.agents.core.chatkit.context import ChatKitRequestContext
from agents_app.agents.core.chatkit.hydrate_from_langgraph import (
    langchain_messages_to_chatkit_items,
    load_langgraph_messages_for_agent_thread,
)
from chatkit.store import Store
from chatkit.types import Attachment, Page, ThreadItem, ThreadMetadata

_logger = logging.getLogger(__name__)


class HydratingChatKitStore(Store[ChatKitRequestContext]):
    """Delegate to an inner store; on empty item pages, hydrate from LangGraph once."""

    def __init__(self, inner: Store[ChatKitRequestContext]) -> None:
        self._inner = inner

    def generate_thread_id(self, context: ChatKitRequestContext) -> str:
        return self._inner.generate_thread_id(context)

    def generate_item_id(
        self, item_type: Any, thread: ThreadMetadata, context: ChatKitRequestContext
    ) -> str:
        return self._inner.generate_item_id(item_type, thread, context)

    async def load_thread(self, thread_id: str, context: ChatKitRequestContext) -> ThreadMetadata:
        return await self._inner.load_thread(thread_id, context)

    async def save_thread(self, thread: ThreadMetadata, context: ChatKitRequestContext) -> None:
        await self._inner.save_thread(thread, context)

    async def load_threads(
        self,
        limit: int,
        after: str | None,
        order: str,
        context: ChatKitRequestContext,
    ) -> Page[ThreadMetadata]:
        return await self._inner.load_threads(limit, after, order, context)

    async def load_thread_items(
        self,
        thread_id: str,
        after: str | None,
        limit: int,
        order: str,
        context: ChatKitRequestContext,
    ) -> Page[ThreadItem]:
        page = await self._inner.load_thread_items(thread_id, after, limit, order, context)
        if page.data or after is not None:
            return page

        agent_tid = (context.agent_thread_id or "").strip()
        if not agent_tid or thread_id.strip() != agent_tid:
            return page

        messages = await load_langgraph_messages_for_agent_thread(
            context, agent_thread_id=agent_tid
        )
        if not messages:
            return page

        thread_meta = await self._inner.load_thread(thread_id, context)
        items = langchain_messages_to_chatkit_items(
            messages,
            thread_id=thread_id,
            generate_item_id=lambda item_type: self.generate_item_id(
                item_type,
                thread_meta,
                context,
            ),
        )
        if not items:
            return page

        _logger.info(
            "ChatKit hydrate from LangGraph thread=%s items=%s",
            thread_id,
            len(items),
        )
        for item in items:
            await self._inner.add_thread_item(thread_id, item, context)

        return await self._inner.load_thread_items(thread_id, after, limit, order, context)

    async def add_thread_item(
        self, thread_id: str, item: ThreadItem, context: ChatKitRequestContext
    ) -> None:
        await self._inner.add_thread_item(thread_id, item, context)

    async def save_item(
        self, thread_id: str, item: ThreadItem, context: ChatKitRequestContext
    ) -> None:
        await self._inner.save_item(thread_id, item, context)

    async def load_item(
        self, thread_id: str, item_id: str, context: ChatKitRequestContext
    ) -> ThreadItem:
        return await self._inner.load_item(thread_id, item_id, context)

    async def delete_thread(self, thread_id: str, context: ChatKitRequestContext) -> None:
        await self._inner.delete_thread(thread_id, context)

    async def delete_thread_item(
        self, thread_id: str, item_id: str, context: ChatKitRequestContext
    ) -> None:
        await self._inner.delete_thread_item(thread_id, item_id, context)

    async def save_attachment(self, attachment: Attachment, context: ChatKitRequestContext) -> None:
        await self._inner.save_attachment(attachment, context)

    async def load_attachment(
        self, attachment_id: str, context: ChatKitRequestContext
    ) -> Attachment:
        return await self._inner.load_attachment(attachment_id, context)

    async def delete_attachment(self, attachment_id: str, context: ChatKitRequestContext) -> None:
        await self._inner.delete_attachment(attachment_id, context)
