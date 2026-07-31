"""Helpers for owner-provided manual brief hints (nested on location)."""

from __future__ import annotations

import strawberry
from sqlalchemy import select
from sqlalchemy.orm import Session

from graphql.context import get_manual_brief_cache
from graphql.data_sources import LocationManualBriefInput
from graphql.schema.types.location_manual_brief_input import LocationManualBriefInputType


def _row_to_manual_brief_type(
    location_id: int, row: LocationManualBriefInput | None
) -> LocationManualBriefInputType:
    if row is None or row.quick_profile is None:
        return LocationManualBriefInputType(location_id=location_id, quick_profile={})
    qp = row.quick_profile
    if isinstance(qp, dict):
        return LocationManualBriefInputType(location_id=location_id, quick_profile=qp)
    return LocationManualBriefInputType(location_id=location_id, quick_profile={})


def load_manual_brief_type(session: Session, location_id: int) -> LocationManualBriefInputType:
    """Build GraphQL type from DB (caller must enforce auth)."""
    row = session.scalars(
        select(LocationManualBriefInput).where(LocationManualBriefInput.location_id == location_id)
    ).first()
    return _row_to_manual_brief_type(location_id, row)


def prefetch_manual_briefs(
    session: Session,
    info: strawberry.Info,
    location_ids: list[int],
) -> None:
    """Batch-load manual briefs into the request cache (avoids N+1 on nested fields)."""
    if not location_ids:
        return
    cache = get_manual_brief_cache(info)
    missing = [lid for lid in location_ids if lid not in cache]
    if not missing:
        return
    rows = session.scalars(
        select(LocationManualBriefInput).where(LocationManualBriefInput.location_id.in_(missing))
    ).all()
    by_location = {row.location_id: row for row in rows}
    for lid in missing:
        cache[lid] = _row_to_manual_brief_type(lid, by_location.get(lid))
