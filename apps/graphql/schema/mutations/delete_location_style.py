"""Delete a location visual style pack."""

from __future__ import annotations

import strawberry

from graphql.context import request_session_scope
from graphql.data_sources.models.location_style import LocationStyle
from graphql.schema.auth import require_location_owner, user_id_from_info


@strawberry.type
class DeleteLocationStyleMutation:
    @strawberry.mutation(description="Delete a location visual style pack by id.")
    def delete_location_style(self, info: strawberry.Info, id: int) -> bool:
        user_id = user_id_from_info(info)
        if not user_id:
            raise ValueError("Missing authenticated user for deleteLocationStyle")

        with request_session_scope(info) as session:
            row = session.query(LocationStyle).filter(LocationStyle.id == id).first()
            if row is None:
                raise ValueError("Location style not found")
            require_location_owner(session, row.location_id, user_id)
            session.delete(row)
            session.commit()
            return True
