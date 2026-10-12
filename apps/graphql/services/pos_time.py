"""POS business-day helpers (Europe/Berlin, DST-safe)."""

from __future__ import annotations

from datetime import date, datetime, time
from zoneinfo import ZoneInfo

POS_TZ = ZoneInfo("Europe/Berlin")


def berlin_now(when: datetime | None = None) -> datetime:
    """Return ``when`` (or now) as a timezone-aware Europe/Berlin datetime."""
    if when is None:
        when = datetime.now(POS_TZ)
    elif when.tzinfo is None:
        when = when.replace(tzinfo=POS_TZ)
    else:
        when = when.astimezone(POS_TZ)
    return when


def berlin_calendar_date(when: datetime | None = None) -> date:
    """Calendar date in Europe/Berlin for ``when`` (or now)."""
    return berlin_now(when).date()


def start_of_berlin_day(on_date: date | None = None, *, when: datetime | None = None) -> datetime:
    """Inclusive start of a Berlin calendar day as an aware datetime."""
    day = on_date if on_date is not None else berlin_calendar_date(when)
    return datetime.combine(day, time.min, tzinfo=POS_TZ)


def end_of_berlin_day(on_date: date | None = None, *, when: datetime | None = None) -> datetime:
    """Exclusive end of a Berlin calendar day (start of next day)."""
    day = on_date if on_date is not None else berlin_calendar_date(when)
    # datetime arithmetic via combine of next calendar day avoids DST edge mistakes
    from datetime import timedelta

    return datetime.combine(day + timedelta(days=1), time.min, tzinfo=POS_TZ)


def is_on_berlin_day(moment: datetime, on_date: date) -> bool:
    """True when ``moment`` falls on ``on_date`` in Europe/Berlin."""
    return berlin_calendar_date(moment) == on_date
