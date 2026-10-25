"""Emit ChatKit widget items without importing ``chatkit.server`` (avoids agents clash)."""

from __future__ import annotations

from collections.abc import AsyncIterator, Callable
from datetime import datetime, timezone

from chatkit.types import (
    ThreadItemDoneEvent,
    ThreadMetadata,
    ThreadStreamEvent,
    WidgetItem,
)
from chatkit.widgets import Card


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


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
        item=WidgetItem(
            id=item_id,
            thread_id=thread.id,
            created_at=_utcnow(),
            widget=widget,
            copy_text=copy_text,
        ),
    )
