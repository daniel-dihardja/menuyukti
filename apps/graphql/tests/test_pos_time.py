"""Europe/Berlin business-day helpers for POS."""

from __future__ import annotations

from datetime import UTC, date, datetime
from zoneinfo import ZoneInfo

from graphql.services.pos_time import (
    berlin_calendar_date,
    is_on_berlin_day,
    start_of_berlin_day,
)

BERLIN = ZoneInfo("Europe/Berlin")


def test_utc_midnight_maps_to_previous_berlin_calendar_date_in_winter() -> None:
    # 2024-01-15 00:30 UTC == 01:30 Berlin (CET, UTC+1) → still 15 Jan Berlin
    moment = datetime(2024, 1, 15, 0, 30, tzinfo=UTC)
    assert berlin_calendar_date(moment) == date(2024, 1, 15)

    # 2024-01-15 00:30 UTC-adjacent: 23:30 UTC on 14 Jan == 00:30 Berlin on 15 Jan
    late_utc = datetime(2024, 1, 14, 23, 30, tzinfo=UTC)
    assert berlin_calendar_date(late_utc) == date(2024, 1, 15)
    assert is_on_berlin_day(late_utc, date(2024, 1, 15))
    assert not is_on_berlin_day(late_utc, date(2024, 1, 14))


def test_dst_spring_forward_boundary() -> None:
    # Europe/Berlin skipped 2024-03-31 02:00 → 03:00. 00:30 UTC == 01:30 CET still 31 Mar.
    before = datetime(2024, 3, 31, 0, 30, tzinfo=UTC)
    assert berlin_calendar_date(before) == date(2024, 3, 31)
    # 01:30 UTC == 03:30 CEST after the jump — still 31 Mar Berlin
    after = datetime(2024, 3, 31, 1, 30, tzinfo=UTC)
    assert berlin_calendar_date(after) == date(2024, 3, 31)


def test_dst_fall_back_boundary() -> None:
    # 2024-10-27 00:30 UTC == 02:30 CEST (still summer offset that morning) → 27 Oct
    moment = datetime(2024, 10, 27, 0, 30, tzinfo=UTC)
    assert berlin_calendar_date(moment) == date(2024, 10, 27)


def test_start_of_berlin_day_is_aware() -> None:
    start = start_of_berlin_day(date(2024, 6, 1))
    assert start.tzinfo is not None
    assert start.astimezone(BERLIN).hour == 0
    assert start.astimezone(BERLIN).minute == 0
    assert berlin_calendar_date(start) == date(2024, 6, 1)
