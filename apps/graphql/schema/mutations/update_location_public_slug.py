"""Owner mutation: set location public_slug without requiring Digital Menu."""

from __future__ import annotations

import strawberry

from graphql.context import request_session_scope
from graphql.data_sources import Location
from graphql.schema.auth import require_location_owner, user_id_from_info
from graphql.schema.mutations.public_slug import apply_location_public_slug


@strawberry.type(description="Result of updating a location public slug.")
class LocationPublicSlugType:
    location_id: int
    public_slug: str | None


@strawberry.type
class UpdateLocationPublicSlugMutation:
    @strawberry.mutation(
        description=(
            "Set or clear the location public URL slug. Requires location ownership. "
            "Does not require a digital_menu subscription. Reserved and duplicate "
            "slugs are rejected."
        )
    )
    def update_location_public_slug(
        self,
        info: strawberry.Info,
        location_id: int,
        public_slug: str | None,
    ) -> LocationPublicSlugType:
        user_id = user_id_from_info(info)
        if not user_id:
            raise ValueError("Missing authenticated user for updateLocationPublicSlug")

        with request_session_scope(info) as session:
            require_location_owner(session, location_id, user_id, info=info)
            location = session.get(Location, location_id)
            if location is None:
                raise ValueError("Location not found")

            apply_location_public_slug(session, location, public_slug)

            session.commit()
            session.refresh(location)
            return LocationPublicSlugType(
                location_id=location_id,
                public_slug=location.public_slug,
            )
