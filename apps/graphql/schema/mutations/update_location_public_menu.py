"""Publish / unpublish a location's public digital menu."""

from __future__ import annotations

import strawberry
from sqlalchemy import select
from strawberry import UNSET

from graphql.context import request_session_scope
from graphql.data_sources import Location
from graphql.schema.auth import require_location_owner, user_id_from_info
from graphql.schema.mappers.menu import menu_to_gql
from graphql.schema.mutations.update_location_frontpage import normalize_public_slug
from graphql.schema.types.menu import MenuType
from graphql.services.menu import get_or_create_menu


@strawberry.type(description="Result of updating public digital menu settings.")
class LocationPublicMenuSettingsType:
    location_id: int
    public_enabled: bool
    public_slug: str | None
    menu: MenuType


@strawberry.type
class UpdateLocationPublicMenuMutation:
    @strawberry.mutation(
        description=(
            "Publish or unpublish the location digital menu and set the public slug. "
            "Requires location ownership. Creates an empty menu when enabling if none exists."
        )
    )
    def update_location_public_menu(
        self,
        info: strawberry.Info,
        location_id: int,
        public_enabled: bool | None = UNSET,
        public_slug: str | None = UNSET,
    ) -> LocationPublicMenuSettingsType:
        user_id = user_id_from_info(info)
        if not user_id:
            raise ValueError("Missing authenticated user for updateLocationPublicMenu")

        with request_session_scope(info) as session:
            require_location_owner(session, location_id, user_id, info=info)

            location = session.get(Location, location_id)
            if location is None:
                raise ValueError("Location not found")

            if public_slug is not UNSET:
                normalized_slug = normalize_public_slug(public_slug)
                if normalized_slug is not None:
                    conflict = session.scalars(
                        select(Location).where(
                            Location.public_slug == normalized_slug,
                            Location.id != location_id,
                        )
                    ).one_or_none()
                    if conflict is not None:
                        raise ValueError("publicSlug is already in use")
                    location.public_slug = normalized_slug
                else:
                    location.public_slug = None

            menu = get_or_create_menu(session, location_id)

            next_enabled = (
                bool(public_enabled)
                if public_enabled is not UNSET
                else bool(menu.public_enabled)
            )
            if next_enabled and not location.public_slug:
                raise ValueError("publicSlug is required when publicEnabled is true")

            if public_enabled is not UNSET:
                menu.public_enabled = next_enabled

            session.commit()
            session.refresh(menu)
            session.refresh(location)

            return LocationPublicMenuSettingsType(
                location_id=location_id,
                public_enabled=bool(menu.public_enabled),
                public_slug=location.public_slug,
                menu=menu_to_gql(menu),
            )
