"""Helpers for location frontpage config (nested on location)."""

from __future__ import annotations

import strawberry
from sqlalchemy import select
from sqlalchemy.orm import Session

from graphql.context import get_frontpage_cache
from graphql.data_sources import LocationFrontpage
from graphql.schema.types.location_frontpage import LocationFrontpageType


def _defaults(location_id: int) -> LocationFrontpageType:
    return LocationFrontpageType(
        location_id=location_id,
        tagline=None,
        show_guest_favorites=True,
        show_popular_combos=True,
    )


def _row_to_frontpage_type(
    location_id: int, row: LocationFrontpage | None
) -> LocationFrontpageType:
    if row is None:
        return _defaults(location_id)
    return LocationFrontpageType(
        location_id=location_id,
        tagline=row.tagline,
        show_guest_favorites=bool(row.show_guest_favorites),
        show_popular_combos=bool(row.show_popular_combos),
    )


def load_frontpage_type(session: Session, location_id: int) -> LocationFrontpageType:
    """Build GraphQL type from DB (caller must enforce auth)."""
    row = session.scalars(
        select(LocationFrontpage).where(LocationFrontpage.location_id == location_id)
    ).first()
    return _row_to_frontpage_type(location_id, row)


def prefetch_frontpages(
    session: Session,
    info: strawberry.Info,
    location_ids: list[int],
) -> None:
    """Batch-load frontpage configs into the request cache (avoids N+1 on nested fields)."""
    if not location_ids:
        return
    cache = get_frontpage_cache(info)
    missing = [lid for lid in location_ids if lid not in cache]
    if not missing:
        return
    rows = session.scalars(
        select(LocationFrontpage).where(LocationFrontpage.location_id.in_(missing))
    ).all()
    by_location = {row.location_id: row for row in rows}
    for lid in missing:
        cache[lid] = _row_to_frontpage_type(lid, by_location.get(lid))
