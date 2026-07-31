"""Location-scoped calendar from manual calendar entries."""

from __future__ import annotations

import strawberry

from graphql.context import request_session_scope
from graphql.data_sources.models.calendar_entry import CalendarEntry
from graphql.schema.auth import is_location_owner, user_id_from_info
from graphql.schema.mappers.calendar import calendar_entry_to_slot_fields
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
        "Location-scoped calendar of manual calendar entries. "
        "Public holidays are not populated by this query."
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


def _payload_from_entries(entries: list[CalendarEntry]) -> SchedulerCalendarPayload:
    if not entries:
        return _empty_payload()

    slots: list[SchedulerCalendarSlotType] = []
    entry_dates: list[str] = []
    for row in entries:
        fields = calendar_entry_to_slot_fields(row)
        slots.append(SchedulerCalendarSlotType(**fields))
        entry_dates.append(row.entry_date)

    return SchedulerCalendarPayload(
        window_start=min(entry_dates),
        window_end=max(entry_dates),
        public_holidays=[],
        slots=slots,
    )


@strawberry.type
class SchedulerCalendarQuery:
    @strawberry.field(
        description=(
            "Manual calendar entries for a location. "
            "Returns an empty payload when the caller is unauthenticated, does not own the "
            "location, or there are no manual entries."
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
            entries = (
                session.query(CalendarEntry)
                .filter(CalendarEntry.location_id == location_id)
                .order_by(CalendarEntry.entry_date, CalendarEntry.entry_time)
                .all()
            )
            return _payload_from_entries(entries)
