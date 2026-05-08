"""Query owner-provided manual brief hints."""

from __future__ import annotations

import strawberry
from sqlalchemy.orm import Session

from graphql.data_sources import LocationManualBriefInput, SessionLocal
from graphql.schema.auth import is_location_owner, user_id_from_info
from graphql.schema.types.location_manual_brief_input import LocationManualBriefInputType


def load_manual_brief_type(session: Session, location_id: int) -> LocationManualBriefInputType:
    """Build GraphQL type from DB (caller must enforce auth)."""
    row = (
        session.query(LocationManualBriefInput)
        .filter(LocationManualBriefInput.location_id == location_id)
        .first()
    )
    if row is None or row.quick_profile is None:
        return LocationManualBriefInputType(location_id=location_id, quick_profile={})
    qp = row.quick_profile
    if isinstance(qp, dict):
        return LocationManualBriefInputType(location_id=location_id, quick_profile=qp)
    return LocationManualBriefInputType(location_id=location_id, quick_profile={})


@strawberry.type
class LocationManualBriefInputQuery:
    @strawberry.field(
        description=(
            "Owner click-first brief hints for a location. Empty quickProfile when unset. "
            "Not AI-generated."
        )
    )
    def location_manual_brief_input(
        self,
        info: strawberry.Info,
        location_id: int,
    ) -> LocationManualBriefInputType | None:
        user_id = user_id_from_info(info)
        with SessionLocal() as session:
            if not is_location_owner(session, location_id, user_id):
                return None
            return load_manual_brief_type(session, location_id)
