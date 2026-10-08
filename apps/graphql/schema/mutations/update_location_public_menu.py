"""Publish / unpublish a location's public digital menu."""

from __future__ import annotations

import strawberry
from strawberry import UNSET

from graphql.context import request_session_scope
from graphql.data_sources import Location
from graphql.schema.auth import require_location_owner, user_id_from_info
from graphql.schema.mappers.menu import menu_to_gql
from graphql.schema.mutations.public_slug import apply_location_public_slug
from graphql.schema.types.menu import MenuType
from graphql.services.menu import get_or_create_menu
from graphql.services.service_subscriptions import (
    SERVICE_KEY_DIGITAL_MENU,
    is_active_subscription,
)


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
        header_image_filename: str | None = UNSET,
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
                apply_location_public_slug(session, location, public_slug)

            menu = get_or_create_menu(session, location_id)

            next_enabled = (
                bool(public_enabled) if public_enabled is not UNSET else bool(menu.public_enabled)
            )
            if next_enabled and not location.public_slug:
                raise ValueError("publicSlug is required when publicEnabled is true")

            if (
                public_enabled is not UNSET
                and next_enabled
                and not is_active_subscription(session, location_id, SERVICE_KEY_DIGITAL_MENU)
            ):
                raise ValueError(
                    "An active digital_menu subscription is required before "
                    "publishing the public menu. Activate the service for this "
                    "location first."
                )

            if public_enabled is not UNSET:
                menu.public_enabled = next_enabled

            if header_image_filename is not UNSET:
                cleaned = (header_image_filename or "").strip() or None
                menu.header_image_filename = cleaned

            session.commit()
            session.refresh(menu)
            session.refresh(location)

            return LocationPublicMenuSettingsType(
                location_id=location_id,
                public_enabled=bool(menu.public_enabled),
                public_slug=location.public_slug,
                menu=menu_to_gql(menu),
            )
