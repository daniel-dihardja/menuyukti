"""Normalize ChatKit item timestamps so store ordering stays chronological.

ChatKit's server builds user messages with naive ``datetime.now()`` (local wall
clock). Our bridge / widgets use timezone-aware UTC. Persisting both into
``TIMESTAMPTZ`` (or sorting in Python) then groups assistants before users in
non-UTC locales on reload — e.g. UTC+1 labels local noon as 12:00Z while the
assistant is correctly ~11:00Z.
"""

from __future__ import annotations

from datetime import UTC, datetime
from typing import TypeVar

from chatkit.types import ThreadItem

TItem = TypeVar("TItem", bound=ThreadItem)


def ensure_utc(value: datetime) -> datetime:
    """Return an aware UTC datetime; naive values are treated as local time."""
    if value.tzinfo is None:
        return value.astimezone(UTC)
    return value.astimezone(UTC)


def with_utc_created_at(item: TItem) -> TItem:
    """Return a copy of ``item`` whose ``created_at`` is timezone-aware UTC."""
    created = getattr(item, "created_at", None)
    if not isinstance(created, datetime):
        return item
    normalized = ensure_utc(created)
    if normalized == created:
        return item
    return item.model_copy(update={"created_at": normalized})
