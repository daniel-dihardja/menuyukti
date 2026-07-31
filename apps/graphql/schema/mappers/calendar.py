"""ORM → GraphQL mappers for calendar entries."""

from __future__ import annotations

from typing import Any

from graphql.data_sources.models.calendar_entry import CalendarEntry
from graphql.schema.types.calendar_entry import CalendarEntryType, CalendarMediaRefType


def entry_to_gql(row: CalendarEntry) -> CalendarEntryType:
    refs_raw = row.media_refs if isinstance(row.media_refs, list) else []
    media_refs: list[CalendarMediaRefType] = []
    for item in refs_raw:
        if not isinstance(item, dict):
            continue
        kind = item.get("kind")
        name = item.get("name")
        if isinstance(kind, str) and isinstance(name, str) and kind and name:
            media_refs.append(CalendarMediaRefType(kind=kind, name=name))
    return CalendarEntryType(
        id=row.id,
        location_id=row.location_id,
        title=row.title,
        description=row.description or "",
        date=row.entry_date,
        time=row.entry_time,
        media_refs=media_refs,
    )


def calendar_entry_to_slot_fields(row: CalendarEntry) -> dict[str, Any]:
    """Map ORM row to scheduler calendar slot kwargs."""
    refs_raw = row.media_refs if isinstance(row.media_refs, list) else []
    media_refs: list[CalendarMediaRefType] = []
    for item in refs_raw:
        if not isinstance(item, dict):
            continue
        kind = item.get("kind")
        name = item.get("name")
        if isinstance(kind, str) and isinstance(name, str) and kind and name:
            media_refs.append(CalendarMediaRefType(kind=kind, name=name))
    return {
        "id": str(row.id),
        "date": row.entry_date,
        "time": row.entry_time,
        "title": row.title,
        "kind": None,
        "description": row.description or "",
        "media_refs": media_refs,
        "source": "manual",
    }
