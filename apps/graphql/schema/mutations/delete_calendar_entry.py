"""Delete a location-scoped manual calendar entry."""

from __future__ import annotations

import strawberry

from graphql.context import request_session_scope
from graphql.data_sources.models.calendar_entry import CalendarEntry
from graphql.schema.auth import require_location_owner, user_id_from_info
from graphql.schema.mappers.calendar import entry_to_gql
from graphql.schema.types.calendar_entry import CalendarEntryType


@strawberry.type
class DeleteCalendarEntryMutation:
    @strawberry.mutation(description="Delete a manual calendar entry.")
    def delete_calendar_entry(self, info: strawberry.Info, id: int) -> CalendarEntryType:
        user_id = user_id_from_info(info)
        if not user_id:
            raise ValueError("Missing authenticated user for deleteCalendarEntry")

        with request_session_scope(info) as session:
            row = session.get(CalendarEntry, id)
            if row is None:
                raise ValueError("Calendar entry not found")
            require_location_owner(session, row.location_id, user_id)
            deleted = entry_to_gql(row)
            session.delete(row)
            session.commit()
            return deleted
