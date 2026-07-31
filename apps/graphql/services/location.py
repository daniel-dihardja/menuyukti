"""Location create/update and opening-hours orchestration."""

from __future__ import annotations

from datetime import time

from sqlalchemy import delete
from sqlalchemy.orm import Session

from graphql.data_sources import Location, LocationOpeningHour

VALID_WEEKDAYS = ("monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday")


def parse_opening_hour_time(raw: str) -> time:
    try:
        value = time.fromisoformat(raw)
    except ValueError as exc:
        raise ValueError(f"Invalid time value: {raw}") from exc
    if value.second != 0 or value.microsecond != 0:
        raise ValueError("Time values must be in HH:MM format")
    return value


def normalize_opening_hours(
    opening_hours: list[tuple[str, str, str]],
) -> list[tuple[str, time, time]]:
    """Normalize (day_of_week, open_time, close_time) string triples."""
    seen_days: set[str] = set()
    normalized: list[tuple[str, time, time]] = []

    for day_raw, open_raw, close_raw in opening_hours:
        day = day_raw.strip().lower()
        if day not in VALID_WEEKDAYS:
            raise ValueError(f"Invalid day_of_week: {day_raw}")
        if day in seen_days:
            raise ValueError(f"Duplicate opening-hour day: {day_raw}")
        seen_days.add(day)

        open_time = parse_opening_hour_time(open_raw)
        close_time = parse_opening_hour_time(close_raw)
        if open_time >= close_time:
            raise ValueError(f"open_time must be earlier than close_time for {day_raw}")
        normalized.append((day, open_time, close_time))

    return normalized


def replace_opening_hours(
    session: Session, location_id: int, normalized: list[tuple[str, time, time]]
) -> None:
    """Delete existing rows then insert new ones.

    Avoid ``row.opening_hours.clear()`` + ``append`` in one flush: SQLAlchemy may emit bulk
    INSERTs before DELETEs, violating ``uq_location_opening_hour_location_day`` on PostgreSQL.
    """
    session.execute(
        delete(LocationOpeningHour).where(LocationOpeningHour.location_id == location_id)
    )
    for day, open_time, close_time in normalized:
        session.add(
            LocationOpeningHour(
                location_id=location_id,
                day_of_week=day,
                open_time=open_time,
                close_time=close_time,
            )
        )


def create_location_row(
    session: Session,
    *,
    workspace_id: int,
    clerk_user_id: str,
    name: str,
    street: str | None,
    city: str | None,
    country: str | None,
    currency: str | None = None,
    include_currency: bool = False,
) -> Location:
    loc_kwargs: dict[str, object] = {
        "workspace_id": workspace_id,
        "name": name,
        "street": street,
        "city": city,
        "country": country,
        "clerk_user_id": clerk_user_id,
    }
    if include_currency:
        loc_kwargs["currency"] = currency
    loc = Location(**loc_kwargs)
    session.add(loc)
    session.flush()
    return loc
