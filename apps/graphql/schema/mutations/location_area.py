"""Mutations for location areas (inventar usage attribution)."""

from __future__ import annotations

import strawberry
from strawberry import UNSET

from graphql.context import request_session_scope
from graphql.data_sources import Location
from graphql.schema.auth import require_location_owner, user_id_from_info
from graphql.schema.mappers.location import location_area_to_gql
from graphql.schema.types.location_area import LocationAreaType
from graphql.services.location_area import (
    create_location_area,
    delete_location_area,
    get_location_area_or_raise,
    update_location_area,
)


@strawberry.type
class LocationAreaMutations:
    @strawberry.mutation(description="Create a named area at a location.")
    def create_location_area(
        self,
        info: strawberry.Info,
        location_id: int,
        name: str,
        sort_order: int | None = None,
    ) -> LocationAreaType:
        user_id = user_id_from_info(info)
        if not user_id:
            raise ValueError("Missing authenticated user for createLocationArea")

        with request_session_scope(info) as session:
            require_location_owner(session, location_id, user_id, info=info)
            location = session.get(Location, location_id)
            if location is None:
                raise ValueError("Location not found")
            row = create_location_area(
                session,
                location_id=location_id,
                name=name,
                sort_order=sort_order,
            )
            session.commit()
            return location_area_to_gql(row)

    @strawberry.mutation(description="Rename or reorder a location area.")
    def update_location_area(
        self,
        info: strawberry.Info,
        id: int,
        name: str | None = UNSET,
        sort_order: int | None = UNSET,
    ) -> LocationAreaType:
        user_id = user_id_from_info(info)
        if not user_id:
            raise ValueError("Missing authenticated user for updateLocationArea")

        with request_session_scope(info) as session:
            row = get_location_area_or_raise(session, id)
            require_location_owner(session, row.location_id, user_id, info=info)
            updated = update_location_area(
                session,
                row,
                name=None if name is UNSET else name,
                sort_order=None if sort_order is UNSET else sort_order,
            )
            session.commit()
            return location_area_to_gql(updated)

    @strawberry.mutation(
        description="Delete a location area. Prior stock movements keep history with a null area."
    )
    def delete_location_area(self, info: strawberry.Info, id: int) -> bool:
        user_id = user_id_from_info(info)
        if not user_id:
            raise ValueError("Missing authenticated user for deleteLocationArea")

        with request_session_scope(info) as session:
            row = get_location_area_or_raise(session, id)
            require_location_owner(session, row.location_id, user_id, info=info)
            delete_location_area(session, row)
            session.commit()
            return True
