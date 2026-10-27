"""Emit ChatKit widget items without importing ``chatkit.server`` (avoids agents clash)."""

from __future__ import annotations

from collections.abc import AsyncIterator, Callable
from datetime import UTC, datetime

from chatkit.types import (
    ThreadItemAddedEvent,
    ThreadItemDoneEvent,
    ThreadItemUpdatedEvent,
    ThreadMetadata,
    ThreadStreamEvent,
    WidgetItem,
    WidgetRootUpdated,
)
from chatkit.widgets import Card


def _utcnow() -> datetime:
    return datetime.now(UTC)


def _widget_item(
    *,
    item_id: str,
    thread: ThreadMetadata,
    widget: Card,
    copy_text: str | None = None,
) -> WidgetItem:
    return WidgetItem(
        id=item_id,
        thread_id=thread.id,
        created_at=_utcnow(),
        widget=widget,
        copy_text=copy_text,
    )


async def emit_widget_added(
    thread: ThreadMetadata,
    widget: Card,
    *,
    item_id: str,
    copy_text: str | None = None,
) -> AsyncIterator[ThreadStreamEvent]:
    """Yield an in-progress widget thread item (can be updated then done)."""
    yield ThreadItemAddedEvent(
        item=_widget_item(
            item_id=item_id,
            thread=thread,
            widget=widget,
            copy_text=copy_text,
        ),
    )


async def emit_widget_root_updated(
    *,
    item_id: str,
    thread: ThreadMetadata,
    widget: Card,
    copy_text: str | None = None,
) -> AsyncIterator[ThreadStreamEvent]:
    """Replace a widget root and mark the item done."""
    yield ThreadItemUpdatedEvent(
        item_id=item_id,
        update=WidgetRootUpdated(widget=widget),
    )
    yield ThreadItemDoneEvent(
        item=_widget_item(
            item_id=item_id,
            thread=thread,
            widget=widget,
            copy_text=copy_text,
        ),
    )


async def emit_widget_done(
    thread: ThreadMetadata,
    widget: Card,
    *,
    generate_id: Callable[[str], str],
    copy_text: str | None = None,
) -> AsyncIterator[ThreadStreamEvent]:
    """Yield a completed widget thread item (non-streaming)."""
    item_id = generate_id("message")
    yield ThreadItemDoneEvent(
        item=_widget_item(
            item_id=item_id,
            thread=thread,
            widget=widget,
            copy_text=copy_text,
        ),
    )
