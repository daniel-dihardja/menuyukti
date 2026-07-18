import asyncio

from graphql.data_sources import Location, Node, SessionLocal
from graphql.data_sources.models.calendar_entry import CalendarEntry
from graphql.schema import schema
from graphql.tests.auth_context import GRAPHQL_TEST_USER_ID, graphql_auth_context

CREATE_CALENDAR_ENTRY = """
mutation CreateCalendarEntry(
  $locationId: Int!
  $title: String!
  $date: String!
  $time: String!
  $description: String
  $mediaRefs: [CalendarMediaRefInput!]
) {
  createCalendarEntry(
    locationId: $locationId
    title: $title
    date: $date
    time: $time
    description: $description
    mediaRefs: $mediaRefs
  ) {
    id
    locationId
    title
    description
    date
    time
    mediaRefs {
      kind
      name
    }
  }
}
"""

SCHEDULER_CALENDAR_QUERY = """
query SchedulerCalendar($locationId: Int!) {
  schedulerCalendar(locationId: $locationId) {
    windowStart
    windowEnd
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


def test_create_calendar_entry():
    location_id = _create_location("Calendar Entry Location")
    result = asyncio.run(
        schema.execute(
            CREATE_CALENDAR_ENTRY,
            variable_values={
                "locationId": location_id,
                "title": "Team offsite",
                "date": "2026-08-01",
                "time": "12:30",
                "description": "All-hands planning",
                "mediaRefs": [{"kind": "photo", "name": "agenda.webp"}],
            },
            context_value=graphql_auth_context(),
        )
    )
    assert not result.errors, result.errors
    entry = result.data["createCalendarEntry"]
    assert entry["title"] == "Team offsite"
    assert entry["description"] == "All-hands planning"
    assert entry["date"] == "2026-08-01"
    assert entry["time"] == "12:30"
    assert entry["locationId"] == location_id
    assert entry["mediaRefs"] == [{"kind": "photo", "name": "agenda.webp"}]


def test_create_calendar_entry_requires_auth():
    location_id = _create_location("Calendar Entry Unauth")
    result = asyncio.run(
        schema.execute(
            CREATE_CALENDAR_ENTRY,
            variable_values={
                "locationId": location_id,
                "title": "Nope",
                "date": "2026-08-01",
                "time": "12:00",
            },
            context_value={},
        )
    )
    assert result.errors
    assert "authenticated" in str(result.errors[0]).lower()


def test_create_calendar_entry_rejects_design_media():
    location_id = _create_location("Calendar Entry Bad Media")
    result = asyncio.run(
        schema.execute(
            CREATE_CALENDAR_ENTRY,
            variable_values={
                "locationId": location_id,
                "title": "Nope",
                "date": "2026-08-01",
                "time": "12:00",
                "mediaRefs": [{"kind": "design", "name": "x.webp"}],
            },
            context_value=graphql_auth_context(),
        )
    )
    assert result.errors
    assert "media" in str(result.errors[0]).lower()


def test_scheduler_calendar_includes_manual_entries():
    location_id = _create_location("Calendar Manual Union")
    created = asyncio.run(
        schema.execute(
            CREATE_CALENDAR_ENTRY,
            variable_values={
                "locationId": location_id,
                "title": "Holiday closure",
                "date": "2026-09-15",
                "time": "09:00",
                "description": "Hello",
                "mediaRefs": [{"kind": "photo", "name": "shot.jpg"}],
            },
            context_value=graphql_auth_context(),
        )
    )
    assert not created.errors, created.errors
    entry_id = str(created.data["createCalendarEntry"]["id"])

    result = asyncio.run(
        schema.execute(
            SCHEDULER_CALENDAR_QUERY,
            variable_values={"locationId": location_id},
            context_value=graphql_auth_context(),
        )
    )
    assert not result.errors, result.errors
    payload = result.data["schedulerCalendar"]
    assert payload["windowStart"] == "2026-09-15"
    assert payload["windowEnd"] == "2026-09-15"
    assert len(payload["slots"]) == 1
    slot = payload["slots"][0]
    assert slot["id"] == entry_id
    assert slot["title"] == "Holiday closure"
    assert slot["description"] == "Hello"
    assert slot["source"] == "manual"
    assert slot["kind"] is None
    assert slot["mediaRefs"] == [{"kind": "photo", "name": "shot.jpg"}]


UPDATE_CALENDAR_ENTRY = """
mutation UpdateCalendarEntry(
  $id: Int!
  $title: String
  $date: String
  $time: String
  $description: String
  $mediaRefs: [CalendarMediaRefInput!]
) {
  updateCalendarEntry(
    id: $id
    title: $title
    date: $date
    time: $time
    description: $description
    mediaRefs: $mediaRefs
  ) {
    id
    title
    description
    date
    time
    mediaRefs {
      kind
      name
    }
  }
}
"""


def test_update_calendar_entry():
    location_id = _create_location("Calendar Entry Update")
    created = asyncio.run(
        schema.execute(
            CREATE_CALENDAR_ENTRY,
            variable_values={
                "locationId": location_id,
                "title": "Original",
                "date": "2026-10-01",
                "time": "10:00",
                "description": "Before",
            },
            context_value=graphql_auth_context(),
        )
    )
    assert not created.errors, created.errors
    entry_id = created.data["createCalendarEntry"]["id"]

    updated = asyncio.run(
        schema.execute(
            UPDATE_CALENDAR_ENTRY,
            variable_values={
                "id": entry_id,
                "title": "Updated",
                "time": "14:30",
                "description": "After",
                "mediaRefs": [{"kind": "photo", "name": "note.jpg"}],
            },
            context_value=graphql_auth_context(),
        )
    )
    assert not updated.errors, updated.errors
    entry = updated.data["updateCalendarEntry"]
    assert entry["title"] == "Updated"
    assert entry["time"] == "14:30"
    assert entry["description"] == "After"
    assert entry["mediaRefs"] == [{"kind": "photo", "name": "note.jpg"}]
