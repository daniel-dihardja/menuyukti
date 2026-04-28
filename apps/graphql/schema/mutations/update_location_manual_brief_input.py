"""Upsert or delete owner manual brief hints."""

from __future__ import annotations

import strawberry
from strawberry.scalars import JSON

from graphql.data_sources import LocationManualBriefInput, SessionLocal
from graphql.schema.auth import require_location_owner, user_id_from_info
from graphql.schema.types.location_manual_brief_input import LocationManualBriefInputType
from graphql.services.manual_quick_profile import (
    is_quick_profile_empty,
    validate_and_normalize_quick_profile,
)


@strawberry.type
class UpdateLocationManualBriefInputMutation:
    @strawberry.mutation(
        description=(
            "Replace owner manual brief hints for a location. Pass quickProfile {} to clear. "
            "Does not modify AI-generated location_social_settings."
        )
    )
    def update_location_manual_brief_input(
        self,
        info: strawberry.Info,
        location_id: int,
        quick_profile: JSON,
    ) -> LocationManualBriefInputType:
        user_id = user_id_from_info(info)
        if not user_id:
            raise ValueError("Missing authenticated user for updateLocationManualBriefInput")

        try:
            normalized = validate_and_normalize_quick_profile(quick_profile)
        except ValueError as exc:
            raise ValueError(str(exc)) from exc

        with SessionLocal() as session:
            require_location_owner(session, location_id, user_id)
            row = (
                session.query(LocationManualBriefInput)
                .filter(LocationManualBriefInput.location_id == location_id)
                .first()
            )

            if is_quick_profile_empty(normalized):
                if row is not None:
                    session.delete(row)
                    session.commit()
                return LocationManualBriefInputType(location_id=location_id, quick_profile={})

            if row is None:
                row = LocationManualBriefInput(location_id=location_id, quick_profile=normalized)
                session.add(row)
            else:
                row.quick_profile = normalized
            session.commit()
            session.refresh(row)
            qp = row.quick_profile if isinstance(row.quick_profile, dict) else {}
            return LocationManualBriefInputType(location_id=location_id, quick_profile=qp)
