from __future__ import annotations

from datetime import time

import strawberry
from sqlalchemy.orm import Session
from strawberry import UNSET

from graphql.data_sources import Location, LocationOpeningHour, SessionLocal
from graphql.schema.auth import require_location_owner, user_id_from_info
from graphql.schema.types import LocationType, OpeningHourType

VALID_WEEKDAYS = ("monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday")


@strawberry.input
class OpeningHourInput:
    day_of_week: str
    open_time: str
    close_time: str


def _parse_time(raw: str) -> time:
    try:
        value = time.fromisoformat(raw)
    except ValueError as exc:
        raise ValueError(f"Invalid time value: {raw}") from exc
    if value.second != 0 or value.microsecond != 0:
        raise ValueError("Time values must be in HH:MM format")
    return value


def _normalize_opening_hours(
    opening_hours: list[OpeningHourInput],
) -> list[tuple[str, time, time]]:
    seen_days: set[str] = set()
    normalized: list[tuple[str, time, time]] = []

    for item in opening_hours:
        day = item.day_of_week.strip().lower()
        if day not in VALID_WEEKDAYS:
            raise ValueError(f"Invalid day_of_week: {item.day_of_week}")
        if day in seen_days:
            raise ValueError(f"Duplicate opening-hour day: {item.day_of_week}")
        seen_days.add(day)

        open_time = _parse_time(item.open_time)
        close_time = _parse_time(item.close_time)
        if open_time >= close_time:
            raise ValueError(f"open_time must be earlier than close_time for {item.day_of_week}")
        normalized.append((day, open_time, close_time))

    return normalized


def _replace_opening_hours(
    session: Session, location_id: int, normalized: list[tuple[str, time, time]]
) -> None:
    """Delete existing rows then insert new ones.

    Avoid ``row.opening_hours.clear()`` + ``append`` in one flush: SQLAlchemy may emit bulk
    INSERTs before DELETEs, violating ``uq_location_opening_hour_location_day`` on PostgreSQL.
    """
    session.query(LocationOpeningHour).filter(
        LocationOpeningHour.location_id == location_id
    ).delete(synchronize_session=False)
    for day, open_time, close_time in normalized:
        session.add(
            LocationOpeningHour(
                location_id=location_id,
                day_of_week=day,
                open_time=open_time,
                close_time=close_time,
            )
        )


def _location_to_gql(row: Location) -> LocationType:
    return LocationType(
        id=row.id,
        name=row.name,
        street=row.street,
        city=row.city,
        country=row.country,
        currency=row.currency,
        node_id=str(row.node_id) if row.node_id is not None else None,
        workspace_id=str(row.workspace_id) if row.workspace_id is not None else None,
        opening_hours=[
            OpeningHourType(
                day_of_week=hour.day_of_week,
                open_time=hour.open_time.strftime("%H:%M"),
                close_time=hour.close_time.strftime("%H:%M"),
            )
            for hour in row.opening_hours
        ],
    )


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
        with SessionLocal() as session:
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
                normalized = _normalize_opening_hours(opening_hours or [])
                _replace_opening_hours(session, location_id, normalized)

            session.commit()
            session.refresh(row)
            return _location_to_gql(row)
