"""Delete a location and its location-scoped dependents."""

from __future__ import annotations

import strawberry

from graphql.context import request_session_scope
from graphql.data_sources import Location
from graphql.schema.auth import require_location_owner, user_id_from_info
from graphql.services.location import delete_location_row


@strawberry.type
class DeleteLocationMutation:
    @strawberry.mutation(
        description="Delete a location and its analytics, stock, and calendar data."
    )
    def delete_location(self, info: strawberry.Info, id: strawberry.ID) -> bool:
        user_id = user_id_from_info(info)
        if not user_id:
            raise ValueError("Missing authenticated user for deleteLocation")

        try:
            location_id = int(str(id))
        except ValueError as exc:
            raise ValueError("Invalid location id") from exc
        if location_id < 1:
            raise ValueError("Invalid location id")

        with request_session_scope(info) as session:
            row = session.get(Location, location_id)
            if row is None:
                return True

            require_location_owner(session, location_id, user_id)
            delete_location_row(session, location_id)
            session.commit()
            return True
