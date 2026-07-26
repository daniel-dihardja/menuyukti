"""Update a location-scoped manual calendar entry."""

from __future__ import annotations

import strawberry
from strawberry import UNSET

from graphql.context import request_session_scope
from graphql.data_sources.models.calendar_entry import CalendarEntry
from graphql.schema.auth import require_location_owner, user_id_from_info
from graphql.schema.mutations.create_calendar_entry import (
    _entry_to_gql,
    _normalize_media_refs,
    _normalize_source_ref,
    _validate_fields,
)
from graphql.schema.types.calendar_entry import (
    CalendarEntryType,
    CalendarMediaRefInput,
    CalendarSourceRefInput,
)


@strawberry.type
class UpdateCalendarEntryMutation:
    @strawberry.mutation(description="Update a manual calendar entry.")
    def update_calendar_entry(
        self,
        info: strawberry.Info,
        id: int,
        title: str | None = None,
        date: str | None = None,
        time: str | None = None,
        description: str | None = UNSET,
        media_refs: list[CalendarMediaRefInput] | None = UNSET,
        source_ref: CalendarSourceRefInput | None = UNSET,
    ) -> CalendarEntryType:
        user_id = user_id_from_info(info)
        if not user_id:
            raise ValueError("Missing authenticated user for updateCalendarEntry")

        with request_session_scope(info) as session:
            row = session.query(CalendarEntry).filter(CalendarEntry.id == id).first()
            if row is None:
                raise ValueError("Calendar entry not found")
            require_location_owner(session, row.location_id, user_id)

            next_title = title if title is not None else row.title
            next_date = date if date is not None else row.entry_date
            next_time = time if time is not None else row.entry_time
            next_description = row.description if description is UNSET else description

            title_clean, desc_clean, date_clean, time_clean = _validate_fields(
                title=next_title,
                description=next_description,
                date=next_date,
                time=next_time,
            )
            row.title = title_clean
            row.description = desc_clean
            row.entry_date = date_clean
            row.entry_time = time_clean

            if media_refs is not UNSET:
                row.media_refs = _normalize_media_refs(media_refs)

            if source_ref is not UNSET:
                row.source_ref = _normalize_source_ref(source_ref)

            session.commit()
            session.refresh(row)
            return _entry_to_gql(row)
