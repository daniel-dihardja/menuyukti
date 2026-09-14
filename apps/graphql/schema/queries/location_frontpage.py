"""Helpers for location frontpage config (nested on location)."""

from __future__ import annotations

from typing import Any

import strawberry
from sqlalchemy import select
from sqlalchemy.orm import Session

from graphql.context import get_frontpage_cache
from graphql.data_sources import LocationFrontpage
from graphql.schema.types.location_frontpage import (
    FrontpageComboImageType,
    FrontpageFavoriteImageType,
    LocationFrontpageType,
)


def _optional_str(value: Any) -> str | None:
    if not isinstance(value, str):
        return None
    stripped = value.strip()
    return stripped or None


def _parse_published(value: Any) -> bool:
    if isinstance(value, bool):
        return value
    return True


def _parse_favorite_images(raw: Any) -> list[FrontpageFavoriteImageType]:
    if not isinstance(raw, list):
        return []
    out: list[FrontpageFavoriteImageType] = []
    for item in raw:
        if not isinstance(item, dict):
            continue
        menu = item.get("menu")
        if not isinstance(menu, str):
            continue
        menu_clean = menu.strip()
        if not menu_clean:
            continue
        image_clean = _optional_str(
            item.get("imageFilename") if "imageFilename" in item else item.get("image_filename")
        )
        description = _optional_str(item.get("description"))
        published = _parse_published(item.get("published"))
        if not image_clean and not description and published:
            continue
        out.append(
            FrontpageFavoriteImageType(
                menu=menu_clean,
                image_filename=image_clean,
                description=description,
                published=published,
            )
        )
    return out


def _parse_combo_images(raw: Any) -> list[FrontpageComboImageType]:
    if not isinstance(raw, list):
        return []
    out: list[FrontpageComboImageType] = []
    for item in raw:
        if not isinstance(item, dict):
            continue
        menu_a = item.get("menuA") or item.get("menu_a")
        menu_b = item.get("menuB") or item.get("menu_b")
        if not isinstance(menu_a, str) or not isinstance(menu_b, str):
            continue
        menu_a_clean = menu_a.strip()
        menu_b_clean = menu_b.strip()
        if not menu_a_clean or not menu_b_clean:
            continue
        image_clean = _optional_str(
            item.get("imageFilename") if "imageFilename" in item else item.get("image_filename")
        )
        description = _optional_str(item.get("description"))
        published = _parse_published(item.get("published"))
        if not image_clean and not description and published:
            continue
        out.append(
            FrontpageComboImageType(
                menu_a=menu_a_clean,
                menu_b=menu_b_clean,
                image_filename=image_clean,
                description=description,
                published=published,
            )
        )
    return out


def _defaults(location_id: int) -> LocationFrontpageType:
    return LocationFrontpageType(
        location_id=location_id,
        tagline=None,
        show_guest_favorites=True,
        show_popular_combos=True,
        wall_enabled=False,
        favorite_images=[],
        combo_images=[],
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
        wall_enabled=bool(row.wall_enabled),
        favorite_images=_parse_favorite_images(row.favorite_images),
        combo_images=_parse_combo_images(row.combo_images),
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
