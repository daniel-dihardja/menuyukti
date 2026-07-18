"""Aggregate scheduler milestone slots for a location calendar view."""

from __future__ import annotations

from typing import Any

import strawberry

from graphql.context import request_session_scope
from graphql.data_sources import Node
from graphql.data_sources.models.calendar_entry import CalendarEntry
from graphql.schema.auth import is_location_owner, user_id_from_info
from graphql.schema.mutations.create_calendar_entry import calendar_entry_to_slot_fields
from graphql.schema.types.calendar_entry import CalendarMediaRefType


@strawberry.type(description="A public holiday overlay for the calendar window.")
class SchedulerCalendarHolidayType:
    name: str
    description: str
    date: str


@strawberry.type(description="A scheduled content slot (feed post, Story, or Reel).")
class SchedulerCalendarSlotType:
    date: str
    time: str
    title: str
    kind: str | None = None
    id: str | None = None
    description: str | None = None
    media_refs: list[CalendarMediaRefType] | None = None
    source: str | None = None


@strawberry.type(
    description=(
        "Location-scoped calendar: union of all scheduler milestone windows, "
        "flattened slots, manual calendar entries, and deduped public holidays."
    )
)
class SchedulerCalendarPayload:
    window_start: str | None
    window_end: str | None
    public_holidays: list[SchedulerCalendarHolidayType]
    slots: list[SchedulerCalendarSlotType]


def _empty_payload() -> SchedulerCalendarPayload:
    return SchedulerCalendarPayload(
        window_start=None,
        window_end=None,
        public_holidays=[],
        slots=[],
    )


def _is_scheduler_milestone(row: Node) -> bool:
    data = row.data
    if not isinstance(data, dict):
        return False
    preset = data.get("presetId")
    return isinstance(preset, str) and preset.strip() == "scheduler"


def _as_str(value: Any) -> str | None:
    if isinstance(value, str) and value.strip():
        return value.strip()
    return None


def _parse_holiday(raw: Any) -> SchedulerCalendarHolidayType | None:
    if not isinstance(raw, dict):
        return None
    name = _as_str(raw.get("name"))
    description = raw.get("description")
    date = _as_str(raw.get("date"))
    if name is None or date is None:
        return None
    desc = description.strip() if isinstance(description, str) else ""
    return SchedulerCalendarHolidayType(name=name, description=desc, date=date)


def _parse_slot(raw: Any) -> SchedulerCalendarSlotType | None:
    if not isinstance(raw, dict):
        return None
    date = _as_str(raw.get("date"))
    time = _as_str(raw.get("time"))
    title = _as_str(raw.get("title"))
    if date is None or time is None or title is None:
        return None
    kind_raw = raw.get("kind")
    kind = kind_raw.strip() if isinstance(kind_raw, str) and kind_raw.strip() else None
    return SchedulerCalendarSlotType(
        date=date,
        time=time,
        title=title,
        kind=kind,
        id=None,
        description=None,
        media_refs=[],
        source="workflow",
    )


def _aggregate_scheduler_rows(rows: list[Node]) -> SchedulerCalendarPayload:
    window_starts: list[str] = []
    window_ends: list[str] = []
    holidays_by_key: dict[tuple[str, str], SchedulerCalendarHolidayType] = {}
    slots: list[SchedulerCalendarSlotType] = []

    for row in rows:
        if not _is_scheduler_milestone(row):
            continue
        mpd = row.milestone_preset_data
        if not isinstance(mpd, dict):
            continue

        start = _as_str(mpd.get("startDate"))
        end = _as_str(mpd.get("endDate"))
        if start is not None:
            window_starts.append(start)
        if end is not None:
            window_ends.append(end)

        holidays_raw = mpd.get("publicHolidays")
        if isinstance(holidays_raw, list):
            for item in holidays_raw:
                holiday = _parse_holiday(item)
                if holiday is None:
                    continue
                key = (holiday.date, holiday.name)
                holidays_by_key.setdefault(key, holiday)

        slots_raw = mpd.get("slots")
        if isinstance(slots_raw, list):
            for item in slots_raw:
                slot = _parse_slot(item)
                if slot is not None:
                    slots.append(slot)

    if not window_starts or not window_ends:
        return SchedulerCalendarPayload(
            window_start=None,
            window_end=None,
            public_holidays=sorted(
                holidays_by_key.values(),
                key=lambda h: (h.date, h.name),
            ),
            slots=slots,
        )

    return SchedulerCalendarPayload(
        window_start=min(window_starts),
        window_end=max(window_ends),
        public_holidays=sorted(
            holidays_by_key.values(),
            key=lambda h: (h.date, h.name),
        ),
        slots=slots,
    )


def _merge_manual_entries(
    payload: SchedulerCalendarPayload,
    entries: list[CalendarEntry],
) -> SchedulerCalendarPayload:
    if not entries:
        return payload

    slots = list(payload.slots)
    entry_dates: list[str] = []
    for row in entries:
        fields = calendar_entry_to_slot_fields(row)
        slots.append(SchedulerCalendarSlotType(**fields))
        entry_dates.append(row.entry_date)

    window_start = payload.window_start
    window_end = payload.window_end
    if entry_dates:
        min_date = min(entry_dates)
        max_date = max(entry_dates)
        if window_start is None or min_date < window_start:
            window_start = min_date
        if window_end is None or max_date > window_end:
            window_end = max_date

    return SchedulerCalendarPayload(
        window_start=window_start,
        window_end=window_end,
        public_holidays=payload.public_holidays,
        slots=slots,
    )


@strawberry.type
class SchedulerCalendarQuery:
    @strawberry.field(
        description=(
            "Aggregate scheduler milestone slots and manual calendar entries for a location. "
            "Returns an empty payload when the caller is unauthenticated, does not own the "
            "location, or there are no scheduler milestones or manual entries."
        )
    )
    def scheduler_calendar(
        self,
        info: strawberry.Info,
        location_id: int,
    ) -> SchedulerCalendarPayload:
        user_id = user_id_from_info(info)
        if not user_id:
            return _empty_payload()
        with request_session_scope(info) as session:
            if not is_location_owner(session, location_id, user_id, info=info):
                return _empty_payload()
            rows = (
                session.query(Node)
                .filter(
                    Node.location_id == location_id,
                    Node.node_type == "milestone",
                )
                .all()
            )
            payload = _aggregate_scheduler_rows(rows)
            entries = (
                session.query(CalendarEntry)
                .filter(CalendarEntry.location_id == location_id)
                .order_by(CalendarEntry.entry_date, CalendarEntry.entry_time)
                .all()
            )
            return _merge_manual_entries(payload, entries)
