"""ORM → GraphQL mappers for locations."""

from __future__ import annotations

from graphql.data_sources import Location
from graphql.data_sources.models.location_area import LocationArea
from graphql.schema.types import LocationAreaType, LocationType, OpeningHourType


def location_area_to_gql(row: LocationArea) -> LocationAreaType:
    return LocationAreaType(
        id=str(row.id),
        location_id=str(row.location_id),
        name=row.name,
        sort_order=row.sort_order,
    )


def location_to_gql(row: Location) -> LocationType:
    opening_hours = [
        OpeningHourType(
            day_of_week=hour.day_of_week,
            open_time=hour.open_time.strftime("%H:%M"),
            close_time=hour.close_time.strftime("%H:%M"),
        )
        for hour in (row.opening_hours or [])
    ]
    areas = [location_area_to_gql(area) for area in (row.areas or [])]
    return LocationType(
        id=row.id,
        name=row.name,
        street=row.street,
        city=row.city,
        country=row.country,
        currency=row.currency,
        node_id=str(row.node_id) if row.node_id is not None else None,
        workspace_id=str(row.workspace_id) if row.workspace_id is not None else None,
        opening_hours=opening_hours,
        areas=areas,
    )
