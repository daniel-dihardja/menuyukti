"""Helpers for location advisor memory (nested on location)."""

from __future__ import annotations

import strawberry
from sqlalchemy import select
from sqlalchemy.orm import Session

from graphql.context import get_advisor_memory_cache
from graphql.data_sources import LocationAdvisorMemory
from graphql.schema.types.location_advisor_memory import LocationAdvisorMemoryType


def _row_to_advisor_memory_type(
    location_id: int, row: LocationAdvisorMemory | None
) -> LocationAdvisorMemoryType:
    if row is None:
        return LocationAdvisorMemoryType(
            location_id=location_id,
            content="",
            updated_at=None,
        )
    return LocationAdvisorMemoryType(
        location_id=location_id,
        content=row.content or "",
        updated_at=row.updated_at,
    )


def load_advisor_memory_type(session: Session, location_id: int) -> LocationAdvisorMemoryType:
    """Build GraphQL type from DB (caller must enforce auth)."""
    row = session.scalars(
        select(LocationAdvisorMemory).where(LocationAdvisorMemory.location_id == location_id)
    ).first()
    return _row_to_advisor_memory_type(location_id, row)


def prefetch_advisor_memories(
    session: Session,
    info: strawberry.Info,
    location_ids: list[int],
) -> None:
    """Batch-load advisor memories into the request cache (avoids N+1 on nested fields)."""
    if not location_ids:
        return
    cache = get_advisor_memory_cache(info)
    missing = [lid for lid in location_ids if lid not in cache]
    if not missing:
        return
    rows = session.scalars(
        select(LocationAdvisorMemory).where(LocationAdvisorMemory.location_id.in_(missing))
    ).all()
    by_location = {row.location_id: row for row in rows}
    for lid in missing:
        cache[lid] = _row_to_advisor_memory_type(lid, by_location.get(lid))
