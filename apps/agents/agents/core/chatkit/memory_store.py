"""In-memory ChatKit Store (dev / fallback when Postgres URL is unset)."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from agents_app.agents.core.chatkit.context import ChatKitRequestContext
from chatkit.store import NotFoundError, Store
from chatkit.types import Attachment, Page, ThreadItem, ThreadMetadata


class MemoryChatKitStore(Store[ChatKitRequestContext]):
    """Process-local ChatKit store. Not shared across workers."""

    def __init__(self) -> None:
        self._threads: dict[str, ThreadMetadata] = {}
        self._items: dict[str, list[ThreadItem]] = {}
        self._attachments: dict[str, Attachment] = {}
        self._owners: dict[str, str] = {}

    def generate_thread_id(self, context: ChatKitRequestContext) -> str:
        # Prefer advisor URL thread id so ChatKit ↔ LangGraph map 1:1.
        if context.agent_thread_id.strip():
            return context.agent_thread_id.strip()
        return super().generate_thread_id(context)

    def _assert_owner(self, thread_id: str, context: ChatKitRequestContext) -> None:
        owner = self._owners.get(thread_id)
        if owner is not None and owner != context.user_id:
            raise NotFoundError(f"Thread {thread_id} not found")

    async def load_thread(self, thread_id: str, context: ChatKitRequestContext) -> ThreadMetadata:
        self._assert_owner(thread_id, context)
        thread = self._threads.get(thread_id)
        if thread is not None:
            return thread
        # Advisor mounts ChatKit with initialThread = agent UUID before any turn.
        if thread_id.strip() == context.agent_thread_id.strip():
            created = ThreadMetadata(
                id=thread_id,
                created_at=datetime.now(timezone.utc),
                metadata={
                    "agent_thread_id": context.agent_thread_id,
                    "user_id": context.user_id,
                },
            )
            await self.save_thread(created, context)
            return created
        raise NotFoundError(f"Thread {thread_id} not found")

    async def save_thread(self, thread: ThreadMetadata, context: ChatKitRequestContext) -> None:
        self._owners[thread.id] = context.user_id
        meta = dict(thread.metadata or {})
        meta.setdefault("agent_thread_id", context.agent_thread_id)
        meta.setdefault("user_id", context.user_id)
        self._threads[thread.id] = thread.model_copy(update={"metadata": meta})

    async def load_threads(
        self,
        limit: int,
        after: str | None,
        order: str,
        context: ChatKitRequestContext,
    ) -> Page[ThreadMetadata]:
        owned = [t for tid, t in self._threads.items() if self._owners.get(tid) == context.user_id]
        reverse = order != "asc"
        owned.sort(key=lambda t: t.created_at, reverse=reverse)
        start = 0
        if after:
            for i, t in enumerate(owned):
                if t.id == after:
                    start = i + 1
                    break
        slice_ = owned[start : start + limit]
        has_more = start + limit < len(owned)
        return Page(
            data=slice_,
            has_more=has_more,
            after=slice_[-1].id if slice_ and has_more else None,
        )

    async def load_thread_items(
        self,
        thread_id: str,
        after: str | None,
        limit: int,
        order: str,
        context: ChatKitRequestContext,
    ) -> Page[ThreadItem]:
        self._assert_owner(thread_id, context)
        items = list(self._items.get(thread_id, []))
        reverse = order != "asc"
        items.sort(key=lambda i: i.created_at, reverse=reverse)
        start = 0
        if after:
            for i, item in enumerate(items):
                if item.id == after:
                    start = i + 1
                    break
        slice_ = items[start : start + limit]
        has_more = start + limit < len(items)
        return Page(
            data=slice_,
            has_more=has_more,
            after=slice_[-1].id if slice_ and has_more else None,
        )

    async def add_thread_item(
        self, thread_id: str, item: ThreadItem, context: ChatKitRequestContext
    ) -> None:
        self._assert_owner(thread_id, context)
        self._items.setdefault(thread_id, []).append(item)

    async def save_item(
        self, thread_id: str, item: ThreadItem, context: ChatKitRequestContext
    ) -> None:
        self._assert_owner(thread_id, context)
        items = self._items.setdefault(thread_id, [])
        for i, existing in enumerate(items):
            if existing.id == item.id:
                items[i] = item
                return
        items.append(item)

    async def load_item(
        self, thread_id: str, item_id: str, context: ChatKitRequestContext
    ) -> ThreadItem:
        self._assert_owner(thread_id, context)
        for item in self._items.get(thread_id, []):
            if item.id == item_id:
                return item
        raise NotFoundError(f"Item {item_id} not found")

    async def delete_thread(self, thread_id: str, context: ChatKitRequestContext) -> None:
        self._assert_owner(thread_id, context)
        self._threads.pop(thread_id, None)
        self._items.pop(thread_id, None)
        self._owners.pop(thread_id, None)

    async def delete_thread_item(
        self, thread_id: str, item_id: str, context: ChatKitRequestContext
    ) -> None:
        self._assert_owner(thread_id, context)
        items = self._items.get(thread_id, [])
        self._items[thread_id] = [i for i in items if i.id != item_id]

    async def save_attachment(self, attachment: Attachment, context: ChatKitRequestContext) -> None:
        self._attachments[attachment.id] = attachment

    async def load_attachment(
        self, attachment_id: str, context: ChatKitRequestContext
    ) -> Attachment:
        attachment = self._attachments.get(attachment_id)
        if attachment is None:
            raise NotFoundError(f"Attachment {attachment_id} not found")
        return attachment

    async def delete_attachment(self, attachment_id: str, context: ChatKitRequestContext) -> None:
        self._attachments.pop(attachment_id, None)


def empty_store_stats(store: MemoryChatKitStore) -> dict[str, Any]:
    return {
        "threads": len(store._threads),
        "attachments": len(store._attachments),
    }
