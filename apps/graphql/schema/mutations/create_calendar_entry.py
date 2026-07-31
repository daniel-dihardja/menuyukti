"""Create a location-scoped manual calendar entry."""

from __future__ import annotations

import re

import strawberry

from graphql.context import request_session_scope
from graphql.data_sources.models.calendar_entry import CalendarEntry
from graphql.schema.auth import require_location_owner, user_id_from_info
from graphql.schema.mappers.calendar import entry_to_gql
from graphql.schema.types.calendar_entry import (
    CalendarEntryType,
    CalendarMediaRefInput,
)

_ALLOWED_MEDIA_KINDS = frozenset({"photo"})
_DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
_TIME_RE = re.compile(r"^\d{2}:\d{2}$")


def _normalize_media_refs(raw: list[CalendarMediaRefInput] | None) -> list[dict[str, str]]:
    if not raw:
        return []
    out: list[dict[str, str]] = []
    for item in raw:
        kind = item.kind.strip().lower()
        name = item.name.strip()
        if kind not in _ALLOWED_MEDIA_KINDS:
            raise ValueError(f"Invalid media ref kind: {item.kind!r}")
        if not name:
            raise ValueError("mediaRefs.name cannot be empty")
        out.append({"kind": kind, "name": name})
    return out


def _validate_fields(
    *,
    title: str,
    description: str | None,
    date: str,
    time: str,
) -> tuple[str, str, str, str]:
    title_clean = title.strip()
    if not title_clean:
        raise ValueError("Title cannot be empty")
    if len(title_clean) > 256:
        raise ValueError("Title is too long")

    desc_clean = (description or "").strip()

    date_clean = date.strip()
    if not _DATE_RE.match(date_clean):
        raise ValueError("date must be YYYY-MM-DD")

    time_clean = time.strip()
    if not _TIME_RE.match(time_clean):
        raise ValueError("time must be HH:MM")

    return title_clean, desc_clean, date_clean, time_clean


@strawberry.type
class CreateCalendarEntryMutation:
    @strawberry.mutation(description="Create a manual calendar entry for a location.")
    def create_calendar_entry(
        self,
        info: strawberry.Info,
        location_id: int,
        title: str,
        date: str,
        time: str,
        description: str | None = None,
        media_refs: list[CalendarMediaRefInput] | None = None,
    ) -> CalendarEntryType:
        user_id = user_id_from_info(info)
        if not user_id:
            raise ValueError("Missing authenticated user for createCalendarEntry")

        title_clean, desc_clean, date_clean, time_clean = _validate_fields(
            title=title,
            description=description,
            date=date,
            time=time,
        )
        refs = _normalize_media_refs(media_refs)

        with request_session_scope(info) as session:
            require_location_owner(session, location_id, user_id)
            row = CalendarEntry(
                location_id=location_id,
                title=title_clean,
                description=desc_clean,
                entry_date=date_clean,
                entry_time=time_clean,
                media_refs=refs,
            )
            session.add(row)
            session.commit()
            session.refresh(row)
            return entry_to_gql(row)
