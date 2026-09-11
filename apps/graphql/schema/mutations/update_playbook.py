"""Update a location-scoped playbook instance."""

from __future__ import annotations

import strawberry

from graphql.context import request_session_scope
from graphql.data_sources.models.playbook import Playbook
from graphql.schema.auth import require_location_owner, user_id_from_info
from graphql.schema.mappers.playbook import playbook_to_gql
from graphql.schema.types.playbook import PlaybookType
from graphql.services.playbook import validate_playbook_fields


@strawberry.type
class UpdatePlaybookMutation:
    @strawberry.mutation(description="Update a playbook instance.")
    def update_playbook(
        self,
        info: strawberry.Info,
        id: int,
        name: str,
        location_id: int,
        start_date: str,
        end_date: str,
    ) -> PlaybookType:
        user_id = user_id_from_info(info)
        if not user_id:
            raise ValueError("Missing authenticated user for updatePlaybook")

        with request_session_scope(info) as session:
            row = session.get(Playbook, id)
            if row is None:
                raise ValueError("Playbook not found")
            require_location_owner(session, row.location_id, user_id)
            if location_id != row.location_id:
                require_location_owner(session, location_id, user_id)

            name_clean, type_clean, start_clean, end_clean = validate_playbook_fields(
                name=name,
                playbook_type=row.playbook_type,
                start_date=start_date,
                end_date=end_date,
            )
            row.name = name_clean
            row.playbook_type = type_clean
            row.location_id = location_id
            row.start_date = start_clean
            row.end_date = end_clean

            session.commit()
            session.refresh(row)
            return playbook_to_gql(row)
