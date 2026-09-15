"""Public (unauthenticated) location guest wall query."""

from __future__ import annotations

import strawberry
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from graphql.context import request_session_scope
from graphql.data_sources import AnalyticsRun, Location, LocationFrontpage, Workspace
from graphql.schema.types.public_location_wall import PublicLocationWallType, PublicWallTileType
from graphql.services.location_wall_tiles import (
    build_wall_tiles,
    pick_star_menus,
    pick_strong_combo_pairs,
)
from graphql.services.menu_combos import build_menu_combos
from graphql.services.menu_engineering import compute_menu_engineering_matrix


def _tiles_from_analytics(
    session,
    location_id: int,
    frontpage: LocationFrontpage | None,
) -> list[PublicWallTileType]:
    show_favorites = True if frontpage is None else bool(frontpage.show_guest_favorites)
    show_combos = True if frontpage is None else bool(frontpage.show_popular_combos)
    favorite_images = list(frontpage.favorite_images) if frontpage else []
    combo_images = list(frontpage.combo_images) if frontpage else []

    latest_run = (
        session.query(AnalyticsRun)
        .filter(AnalyticsRun.location_id == location_id)
        .order_by(AnalyticsRun.id.desc())
        .first()
    )

    star_menus: list[str] = []
    combo_pairs: list[tuple[str, str]] = []
    if latest_run is not None:
        matrix = compute_menu_engineering_matrix(session, latest_run)
        if matrix is not None:
            star_menus = pick_star_menus(matrix.items)
        combos_payload = build_menu_combos(session, latest_run)
        if combos_payload is not None:
            combo_pairs = pick_strong_combo_pairs(list(combos_payload.get("pairs") or []))

    tiles = build_wall_tiles(
        show_guest_favorites=show_favorites,
        show_popular_combos=show_combos,
        favorite_images=favorite_images,
        combo_images=combo_images,
        star_menus=star_menus,
        combo_pairs=combo_pairs,
    )
    return [
        PublicWallTileType(
            kind=tile.kind,
            key=tile.key,
            title=tile.title,
            description=tile.description,
            image_filename=tile.image_filename,
        )
        for tile in tiles
    ]


@strawberry.type
class PublicLocationWallQuery:
    @strawberry.field(
        description=(
            "Public curated guest wall by location slug. Returns null when the slug "
            "is missing or the wall is not enabled. No authentication required."
        )
    )
    def public_location_wall(
        self,
        info: strawberry.Info,
        slug: str,
    ) -> PublicLocationWallType | None:
        cleaned = slug.strip().lower()
        if not cleaned:
            return None

        with request_session_scope(info) as session:
            location = session.scalars(
                select(Location)
                .options(selectinload(Location.frontpage))
                .where(Location.public_slug == cleaned)
            ).one_or_none()
            if location is None:
                return None

            frontpage = location.frontpage
            if frontpage is None or not bool(frontpage.wall_enabled):
                return None

            media_owner: str | None = location.clerk_user_id
            workspace_id: str | None = None
            if location.workspace_id is not None:
                workspace_id = str(location.workspace_id)
                workspace = session.get(Workspace, location.workspace_id)
                if workspace is not None:
                    media_owner = workspace.owner_clerk_user_id

            tiles = _tiles_from_analytics(session, location.id, frontpage)
            return PublicLocationWallType(
                location_id=location.id,
                name=location.name,
                tagline=frontpage.tagline,
                public_slug=cleaned,
                workspace_id=strawberry.ID(workspace_id) if workspace_id else None,
                media_owner_clerk_user_id=media_owner,
                tiles=tiles,
            )
