"""Delete a location-scoped playbook instance."""

from __future__ import annotations

import strawberry

from graphql.context import request_session_scope
from graphql.data_sources.models.playbook import Playbook
from graphql.schema.auth import require_location_owner, user_id_from_info


@strawberry.type
class DeletePlaybookMutation:
    @strawberry.mutation(description="Delete a playbook instance.")
    def delete_playbook(self, info: strawberry.Info, id: int) -> bool:
        user_id = user_id_from_info(info)
        if not user_id:
            raise ValueError("Missing authenticated user for deletePlaybook")

        with request_session_scope(info) as session:
            row = session.get(Playbook, id)
            if row is None:
                raise ValueError("Playbook not found")
            require_location_owner(session, row.location_id, user_id)
            session.delete(row)
            session.commit()
            return True
