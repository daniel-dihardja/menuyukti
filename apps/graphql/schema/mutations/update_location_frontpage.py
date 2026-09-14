"""Upsert location guest frontpage configuration."""

from __future__ import annotations

import strawberry

from graphql.context import request_session_scope
from graphql.data_sources import LocationFrontpage
from graphql.schema.auth import require_location_owner, user_id_from_info
from graphql.schema.types.location_frontpage import LocationFrontpageType

_TAGLINE_MAX_LEN = 512


def _normalize_tagline(tagline: str | None) -> str | None:
    if tagline is None:
        return None
    stripped = tagline.strip()
    if not stripped:
        return None
    if len(stripped) > _TAGLINE_MAX_LEN:
        raise ValueError(f"tagline must be at most {_TAGLINE_MAX_LEN} characters")
    return stripped


@strawberry.type
class UpdateLocationFrontpageMutation:
    @strawberry.mutation(
        description=(
            "Upsert guest frontpage settings for a location (tagline and section toggles)."
        )
    )
    def update_location_frontpage(
        self,
        info: strawberry.Info,
        location_id: int,
        show_guest_favorites: bool = True,
        show_popular_combos: bool = True,
        tagline: str | None = None,
    ) -> LocationFrontpageType:
        user_id = user_id_from_info(info)
        if not user_id:
            raise ValueError("Missing authenticated user for updateLocationFrontpage")

        try:
            normalized_tagline = _normalize_tagline(tagline)
        except ValueError as exc:
            raise ValueError(str(exc)) from exc

        with request_session_scope(info) as session:
            require_location_owner(session, location_id, user_id)
            row = (
                session.query(LocationFrontpage)
                .filter(LocationFrontpage.location_id == location_id)
                .first()
            )

            if row is None:
                row = LocationFrontpage(
                    location_id=location_id,
                    tagline=normalized_tagline,
                    show_guest_favorites=show_guest_favorites,
                    show_popular_combos=show_popular_combos,
                )
                session.add(row)
            else:
                row.tagline = normalized_tagline
                row.show_guest_favorites = show_guest_favorites
                row.show_popular_combos = show_popular_combos

            session.commit()
            session.refresh(row)
            return LocationFrontpageType(
                location_id=location_id,
                tagline=row.tagline,
                show_guest_favorites=bool(row.show_guest_favorites),
                show_popular_combos=bool(row.show_popular_combos),
            )
