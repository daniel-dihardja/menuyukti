from __future__ import annotations

import strawberry
from strawberry import UNSET

from graphql.context import request_session_scope
from graphql.data_sources import Location
from graphql.schema.auth import require_location_owner, user_id_from_info
from graphql.schema.mappers.location import location_to_gql
from graphql.schema.types import LocationType
from graphql.services.location import normalize_opening_hours, replace_opening_hours


@strawberry.input
class OpeningHourInput:
    day_of_week: str
    open_time: str
    close_time: str


@strawberry.type
class UpdateLocationMutation:
    @strawberry.mutation
    def update_location(
        self,
        info: strawberry.Info,
        id: strawberry.ID,
        name: str | None = UNSET,
        street: str | None = UNSET,
        city: str | None = UNSET,
        country: str | None = UNSET,
        currency: str | None = UNSET,
        opening_hours: list[OpeningHourInput] | None = UNSET,
    ) -> LocationType:
        user_id = user_id_from_info(info)
        if not user_id:
            raise ValueError("Missing authenticated user for updateLocation")

        location_id = int(id)
        with request_session_scope(info) as session:
            require_location_owner(session, location_id, user_id)
            row = session.get(Location, location_id)
            if row is None:
                raise ValueError("Location not found")

            if name is not UNSET:
                if name is None:
                    raise ValueError("name cannot be empty")
                stripped_name = name.strip()
                if not stripped_name:
                    raise ValueError("name cannot be empty")
                row.name = stripped_name
            if street is not UNSET:
                row.street = street.strip() if street else None
            if city is not UNSET:
                row.city = city.strip() if city else None
            if country is not UNSET:
                row.country = country.strip() if country else None
            if currency is not UNSET:
                row.currency = currency.strip().upper() if currency else None

            if opening_hours is not UNSET:
                triples = [
                    (item.day_of_week, item.open_time, item.close_time)
                    for item in (opening_hours or [])
                ]
                normalized = normalize_opening_hours(triples)
                replace_opening_hours(session, location_id, normalized)

            session.commit()
            session.refresh(row)
            return location_to_gql(row)
