"""Upsert location guest frontpage configuration."""

from __future__ import annotations

import re
from typing import Any

import strawberry
from strawberry import UNSET

from graphql.context import request_session_scope
from graphql.data_sources import Location, LocationFrontpage
from graphql.schema.auth import require_location_owner, user_id_from_info
from graphql.schema.queries.location_frontpage import _row_to_frontpage_type
from graphql.schema.types.location_frontpage import (
    FrontpageComboImageInput,
    FrontpageFavoriteImageInput,
    LocationFrontpageType,
)

_TAGLINE_MAX_LEN = 512
_IMAGE_FILENAME_MAX_LEN = 512
_DESCRIPTION_MAX_LEN = 512
_PUBLIC_SLUG_MAX_LEN = 128
_PUBLIC_SLUG_RE = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")


def _normalize_tagline(tagline: str | None) -> str | None:
    if tagline is None:
        return None
    stripped = tagline.strip()
    if not stripped:
        return None
    if len(stripped) > _TAGLINE_MAX_LEN:
        raise ValueError(f"tagline must be at most {_TAGLINE_MAX_LEN} characters")
    return stripped


def _normalize_optional_image(raw: str | None, *, field: str) -> str | None:
    if raw is None:
        return None
    stripped = raw.strip()
    if not stripped:
        return None
    if len(stripped) > _IMAGE_FILENAME_MAX_LEN:
        raise ValueError(f"{field} must be at most {_IMAGE_FILENAME_MAX_LEN} characters")
    return stripped


def _normalize_optional_description(raw: str | None, *, field: str) -> str | None:
    if raw is None:
        return None
    stripped = raw.strip()
    if not stripped:
        return None
    if len(stripped) > _DESCRIPTION_MAX_LEN:
        raise ValueError(f"{field} must be at most {_DESCRIPTION_MAX_LEN} characters")
    return stripped


def normalize_public_slug(raw: str | None) -> str | None:
    """Normalize a public wall slug to lowercase kebab-case, or None if empty."""
    if raw is None:
        return None
    stripped = raw.strip().lower()
    if not stripped:
        return None
    # Allow operators to paste spaced names; coerce to kebab-case.
    coerced = re.sub(r"[^a-z0-9]+", "-", stripped)
    coerced = re.sub(r"-+", "-", coerced).strip("-")
    if not coerced:
        return None
    if len(coerced) > _PUBLIC_SLUG_MAX_LEN:
        raise ValueError(f"publicSlug must be at most {_PUBLIC_SLUG_MAX_LEN} characters")
    if not _PUBLIC_SLUG_RE.fullmatch(coerced):
        raise ValueError("publicSlug must be lowercase letters, numbers, and hyphens")
    return coerced


def _normalize_favorite_images(
    raw: list[FrontpageFavoriteImageInput] | None,
) -> list[dict[str, Any]]:
    if not raw:
        return []
    by_menu: dict[str, dict[str, Any]] = {}
    for item in raw:
        menu = item.menu.strip()
        if not menu:
            raise ValueError("favoriteImages.menu cannot be empty")
        image_filename = _normalize_optional_image(
            item.image_filename, field="favoriteImages.imageFilename"
        )
        description = _normalize_optional_description(
            item.description, field="favoriteImages.description"
        )
        published = bool(item.published)
        # Default published=true with no media/copy is a no-op; skip to keep storage lean.
        if not image_filename and not description and published:
            continue
        entry: dict[str, Any] = {"menu": menu, "published": published}
        if image_filename is not None:
            entry["imageFilename"] = image_filename
        if description is not None:
            entry["description"] = description
        by_menu[menu] = entry
    return list(by_menu.values())


def _normalize_combo_images(
    raw: list[FrontpageComboImageInput] | None,
) -> list[dict[str, Any]]:
    if not raw:
        return []
    by_pair: dict[tuple[str, str], dict[str, Any]] = {}
    for item in raw:
        menu_a = item.menu_a.strip()
        menu_b = item.menu_b.strip()
        if not menu_a or not menu_b:
            raise ValueError("comboImages.menuA and menuB cannot be empty")
        image_filename = _normalize_optional_image(
            item.image_filename, field="comboImages.imageFilename"
        )
        description = _normalize_optional_description(
            item.description, field="comboImages.description"
        )
        published = bool(item.published)
        if not image_filename and not description and published:
            continue
        # Canonical pair key is order-insensitive so flipped analytics pairs share one override.
        key = (menu_a, menu_b) if menu_a <= menu_b else (menu_b, menu_a)
        entry: dict[str, Any] = {
            "menuA": key[0],
            "menuB": key[1],
            "published": published,
        }
        if image_filename is not None:
            entry["imageFilename"] = image_filename
        if description is not None:
            entry["description"] = description
        by_pair[key] = entry
    return list(by_pair.values())


@strawberry.type
class UpdateLocationFrontpageMutation:
    @strawberry.mutation(
        description=(
            "Upsert guest frontpage settings for a location (tagline, section toggles, "
            "wall publish settings, and optional media image / description / publish overrides)."
        )
    )
    def update_location_frontpage(
        self,
        info: strawberry.Info,
        location_id: int,
        show_guest_favorites: bool = True,
        show_popular_combos: bool = True,
        tagline: str | None = None,
        wall_enabled: bool | None = UNSET,
        public_slug: str | None = UNSET,
        favorite_images: list[FrontpageFavoriteImageInput] | None = UNSET,
        combo_images: list[FrontpageComboImageInput] | None = UNSET,
    ) -> LocationFrontpageType:
        user_id = user_id_from_info(info)
        if not user_id:
            raise ValueError("Missing authenticated user for updateLocationFrontpage")

        try:
            normalized_tagline = _normalize_tagline(tagline)
            normalized_favorites = (
                _normalize_favorite_images(favorite_images)
                if favorite_images is not UNSET
                else None
            )
            normalized_combos = (
                _normalize_combo_images(combo_images) if combo_images is not UNSET else None
            )
            normalized_slug = (
                normalize_public_slug(public_slug) if public_slug is not UNSET else UNSET
            )
        except ValueError as exc:
            raise ValueError(str(exc)) from exc

        with request_session_scope(info) as session:
            require_location_owner(session, location_id, user_id)
            location = session.get(Location, location_id)
            if location is None:
                raise ValueError("Location not found")

            row = (
                session.query(LocationFrontpage)
                .filter(LocationFrontpage.location_id == location_id)
                .first()
            )

            next_wall_enabled = (
                bool(wall_enabled)
                if wall_enabled is not UNSET
                else (bool(row.wall_enabled) if row is not None else False)
            )

            if normalized_slug is not UNSET:
                if normalized_slug is not None:
                    clash = (
                        session.query(Location)
                        .filter(
                            Location.public_slug == normalized_slug,
                            Location.id != location_id,
                        )
                        .first()
                    )
                    if clash is not None:
                        raise ValueError("publicSlug is already in use")
                    location.public_slug = normalized_slug
                else:
                    location.public_slug = None

            effective_slug = location.public_slug
            if next_wall_enabled and not effective_slug:
                raise ValueError("publicSlug is required when wallEnabled is true")

            if row is None:
                row = LocationFrontpage(
                    location_id=location_id,
                    tagline=normalized_tagline,
                    show_guest_favorites=show_guest_favorites,
                    show_popular_combos=show_popular_combos,
                    wall_enabled=next_wall_enabled,
                    favorite_images=normalized_favorites
                    if normalized_favorites is not None
                    else [],
                    combo_images=normalized_combos if normalized_combos is not None else [],
                )
                session.add(row)
            else:
                row.tagline = normalized_tagline
                row.show_guest_favorites = show_guest_favorites
                row.show_popular_combos = show_popular_combos
                row.wall_enabled = next_wall_enabled
                if normalized_favorites is not None:
                    row.favorite_images = normalized_favorites
                if normalized_combos is not None:
                    row.combo_images = normalized_combos

            session.commit()
            session.refresh(row)
            return _row_to_frontpage_type(location_id, row)
