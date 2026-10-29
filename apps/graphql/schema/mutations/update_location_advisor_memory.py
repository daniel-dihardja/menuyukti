"""Upsert or clear location advisor memory."""

from __future__ import annotations

import strawberry

from graphql.context import request_session_scope
from graphql.data_sources import LocationAdvisorMemory
from graphql.schema.auth import require_location_owner, user_id_from_info
from graphql.schema.types.location_advisor_memory import LocationAdvisorMemoryType
from graphql.services.advisor_memory import normalize_advisor_memory_content


@strawberry.type
class UpdateLocationAdvisorMemoryMutation:
    @strawberry.mutation(
        description=(
            "Replace advisor memory for a location. Pass empty content to clear. "
            "Does not modify owner manualBriefInput / quickProfile."
        )
    )
    def update_location_advisor_memory(
        self,
        info: strawberry.Info,
        location_id: int,
        content: str,
    ) -> LocationAdvisorMemoryType:
        user_id = user_id_from_info(info)
        if not user_id:
            raise ValueError("Missing authenticated user for updateLocationAdvisorMemory")

        try:
            normalized = normalize_advisor_memory_content(content)
        except ValueError as exc:
            raise ValueError(str(exc)) from exc

        with request_session_scope(info) as session:
            require_location_owner(session, location_id, user_id)
            row = (
                session.query(LocationAdvisorMemory)
                .filter(LocationAdvisorMemory.location_id == location_id)
                .first()
            )

            if not normalized:
                if row is not None:
                    session.delete(row)
                    session.commit()
                return LocationAdvisorMemoryType(
                    location_id=location_id,
                    content="",
                    updated_at=None,
                )

            if row is None:
                row = LocationAdvisorMemory(location_id=location_id, content=normalized)
                session.add(row)
            else:
                row.content = normalized
            session.commit()
            session.refresh(row)
            return LocationAdvisorMemoryType(
                location_id=location_id,
                content=row.content or "",
                updated_at=row.updated_at,
            )
