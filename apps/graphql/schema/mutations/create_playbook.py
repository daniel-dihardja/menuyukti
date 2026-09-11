"""Create a location-scoped playbook instance."""

from __future__ import annotations

import strawberry

from graphql.context import request_session_scope
from graphql.data_sources.models.playbook import Playbook
from graphql.schema.auth import require_location_owner, user_id_from_info
from graphql.schema.mappers.playbook import playbook_to_gql
from graphql.schema.types.playbook import PlaybookType
from graphql.services.playbook import validate_playbook_fields


@strawberry.type
class CreatePlaybookMutation:
    @strawberry.mutation(description="Create a playbook instance for a location.")
    def create_playbook(
        self,
        info: strawberry.Info,
        location_id: int,
        name: str,
        playbook_type: str,
        start_date: str,
        end_date: str,
    ) -> PlaybookType:
        user_id = user_id_from_info(info)
        if not user_id:
            raise ValueError("Missing authenticated user for createPlaybook")

        name_clean, type_clean, start_clean, end_clean = validate_playbook_fields(
            name=name,
            playbook_type=playbook_type,
            start_date=start_date,
            end_date=end_date,
        )

        with request_session_scope(info) as session:
            require_location_owner(session, location_id, user_id)
            row = Playbook(
                location_id=location_id,
                name=name_clean,
                playbook_type=type_clean,
                start_date=start_clean,
                end_date=end_clean,
            )
            session.add(row)
            session.commit()
            session.refresh(row)
            return playbook_to_gql(row)
