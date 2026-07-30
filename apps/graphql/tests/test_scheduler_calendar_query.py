import asyncio

from graphql.data_sources import Location, Node, SessionLocal
from graphql.data_sources.models.calendar_entry import CalendarEntry
from graphql.schema import schema
from graphql.tests.auth_context import GRAPHQL_TEST_USER_ID, graphql_auth_context

SCHEDULER_CALENDAR_QUERY = """
query SchedulerCalendar($locationId: Int!) {
  schedulerCalendar(locationId: $locationId) {
    windowStart
    windowEnd
    publicHolidays {
      name
      description
      date
    }
    slots {
      id
      kind
      date
      time
      title
      description
      source
      mediaRefs {
        kind
        name
      }
    }
  }
}
"""

CREATE_CALENDAR_ENTRY = """
mutation CreateCalendarEntry(
  $locationId: Int!
  $title: String!
  $date: String!
  $time: String!
  $description: String
) {
  createCalendarEntry(
    locationId: $locationId
    title: $title
    date: $date
    time: $time
    description: $description
  ) {
    id
    title
    date
    time
  }
}
"""


def _create_location(name: str) -> int:
    session = SessionLocal()
    try:
        session.query(CalendarEntry).delete()
        session.query(Node).delete()
        session.query(Location).filter(Location.clerk_user_id == GRAPHQL_TEST_USER_ID).delete()
        session.commit()

        location = Location(name=name, clerk_user_id=GRAPHQL_TEST_USER_ID)
        session.add(location)
        session.commit()
        session.refresh(location)
        return location.id
    finally:
        session.close()


def test_scheduler_calendar_empty_for_unauthenticated():
    location_id = _create_location("Calendar Unauth Location")
    result = asyncio.run(
        schema.execute(
            SCHEDULER_CALENDAR_QUERY,
            variable_values={"locationId": location_id},
            context_value={},
        )
    )
    assert not result.errors, result.errors
    payload = result.data["schedulerCalendar"]
    assert payload["windowStart"] is None
    assert payload["windowEnd"] is None
    assert payload["slots"] == []
    assert payload["publicHolidays"] == []


def test_scheduler_calendar_empty_when_no_entries():
    location_id = _create_location("Calendar Empty Location")

    result = asyncio.run(
        schema.execute(
            SCHEDULER_CALENDAR_QUERY,
            variable_values={"locationId": location_id},
            context_value=graphql_auth_context(),
        )
    )
    assert not result.errors, result.errors
    payload = result.data["schedulerCalendar"]
    assert payload["windowStart"] is None
    assert payload["windowEnd"] is None
    assert payload["slots"] == []
    assert payload["publicHolidays"] == []


def test_scheduler_calendar_returns_manual_entries_window():
    location_id = _create_location("Calendar Manual Location")

    first = asyncio.run(
        schema.execute(
            CREATE_CALENDAR_ENTRY,
            variable_values={
                "locationId": location_id,
                "title": "Lunch special",
                "date": "2026-07-02",
                "time": "11:00",
            },
            context_value=graphql_auth_context(),
        )
    )
    assert not first.errors, first.errors

    second = asyncio.run(
        schema.execute(
            CREATE_CALENDAR_ENTRY,
            variable_values={
                "locationId": location_id,
                "title": "Weekend buzz",
                "date": "2026-07-12",
                "time": "18:00",
                "description": "Reel plan",
            },
            context_value=graphql_auth_context(),
        )
    )
    assert not second.errors, second.errors

    result = asyncio.run(
        schema.execute(
            SCHEDULER_CALENDAR_QUERY,
            variable_values={"locationId": location_id},
            context_value=graphql_auth_context(),
        )
    )
    assert not result.errors, result.errors
    payload = result.data["schedulerCalendar"]
    assert payload["windowStart"] == "2026-07-02"
    assert payload["windowEnd"] == "2026-07-12"
    assert payload["publicHolidays"] == []
    assert len(payload["slots"]) == 2
    titles = {s["title"] for s in payload["slots"]}
    assert titles == {"Lunch special", "Weekend buzz"}
    assert all(s["source"] == "manual" for s in payload["slots"])


def test_scheduler_calendar_empty_for_other_user_location():
    session = SessionLocal()
    try:
        session.query(CalendarEntry).delete()
        session.query(Node).delete()
        session.query(Location).filter(Location.clerk_user_id == GRAPHQL_TEST_USER_ID).delete()
        session.commit()

        location = Location(name="Other Owner Location", clerk_user_id="other-user")
        session.add(location)
        session.commit()
        session.refresh(location)
        location_id = location.id
    finally:
        session.close()

    result = asyncio.run(
        schema.execute(
            SCHEDULER_CALENDAR_QUERY,
            variable_values={"locationId": location_id},
            context_value=graphql_auth_context(),
        )
    )
    assert not result.errors, result.errors
    payload = result.data["schedulerCalendar"]
    assert payload["windowStart"] is None
    assert payload["slots"] == []
