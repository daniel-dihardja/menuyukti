"""List and fetch location-scoped playbook instances."""

from __future__ import annotations

import strawberry
from sqlalchemy import or_, select

from graphql.context import request_session_scope
from graphql.data_sources import Location, WorkspaceMembership
from graphql.data_sources.models.playbook import Playbook
from graphql.schema.auth import is_location_owner, user_id_from_info
from graphql.schema.mappers.playbook import playbook_to_gql
from graphql.schema.types.playbook import PlaybookType
from graphql.services.playbook import KNOWN_PLAYBOOK_TYPES


@strawberry.type
class PlaybooksQuery:
    @strawberry.field(
        description=(
            "Playbook instances of a given type for all locations the caller can access."
        )
    )
    def playbooks(self, info: strawberry.Info, playbook_type: str) -> list[PlaybookType]:
        user_id = user_id_from_info(info)
        if not user_id:
            return []

        type_clean = playbook_type.strip().lower()
        if type_clean not in KNOWN_PLAYBOOK_TYPES:
            return []

        with request_session_scope(info) as session:
            workspace_ids = list(
                session.scalars(
                    select(WorkspaceMembership.workspace_id).where(
                        WorkspaceMembership.clerk_user_id == user_id
                    )
                ).all()
            )
            access = [Location.clerk_user_id == user_id]
            if workspace_ids:
                access.append(Location.workspace_id.in_(workspace_ids))
            location_ids = list(
                session.scalars(select(Location.id).where(or_(*access))).all()
            )
            if not location_ids:
                return []

            rows = list(
                session.scalars(
                    select(Playbook)
                    .where(
                        Playbook.playbook_type == type_clean,
                        Playbook.location_id.in_(location_ids),
                    )
                    .order_by(Playbook.created_at.desc(), Playbook.id.desc())
                ).all()
            )
            return [playbook_to_gql(row) for row in rows]

    @strawberry.field(description="A single playbook instance by id, if the caller can access it.")
    def playbook(self, info: strawberry.Info, id: int) -> PlaybookType | None:
        user_id = user_id_from_info(info)
        if not user_id:
            return None

        with request_session_scope(info) as session:
            row = session.get(Playbook, id)
            if row is None:
                return None
            if not is_location_owner(session, row.location_id, user_id, info=info):
                return None
            return playbook_to_gql(row)
