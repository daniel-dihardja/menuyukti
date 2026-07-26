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
  $sourceRef: CalendarSourceRefInput
) {
  createCalendarEntry(
    locationId: $locationId
    title: $title
    date: $date
    time: $time
    description: $description
    mediaRefs: $mediaRefs
    sourceRef: $sourceRef
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
    sourceRef {
      type
      workflowId
      itemId
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
      sourceRef {
        type
        workflowId
        itemId
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
    assert entry["sourceRef"] is None


def test_create_calendar_entry_with_source_ref():
    location_id = _create_location("Calendar Entry Source Ref")
    result = asyncio.run(
        schema.execute(
            CREATE_CALENDAR_ENTRY,
            variable_values={
                "locationId": location_id,
                "title": "IG post",
                "date": "2026-08-02",
                "time": "18:00",
                "sourceRef": {
                    "type": "instagram_item",
                    "workflowId": "42",
                    "itemId": "99",
                },
            },
            context_value=graphql_auth_context(),
        )
    )
    assert not result.errors, result.errors
    entry = result.data["createCalendarEntry"]
    assert entry["sourceRef"] == {
        "type": "instagram_item",
        "workflowId": "42",
        "itemId": "99",
    }


def test_create_calendar_entry_rejects_invalid_source_type():
    location_id = _create_location("Calendar Entry Bad Source")
    result = asyncio.run(
        schema.execute(
            CREATE_CALENDAR_ENTRY,
            variable_values={
                "locationId": location_id,
                "title": "Nope",
                "date": "2026-08-01",
                "time": "12:00",
                "sourceRef": {
                    "type": "unknown",
                    "workflowId": "1",
                    "itemId": "2",
                },
            },
            context_value=graphql_auth_context(),
        )
    )
    assert result.errors
    assert "sourceref" in str(result.errors[0]).lower().replace(" ", "")


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
                "sourceRef": {
                    "type": "instagram_item",
                    "workflowId": "7",
                    "itemId": "3",
                },
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
    assert slot["sourceRef"] == {
        "type": "instagram_item",
        "workflowId": "7",
        "itemId": "3",
    }


UPDATE_CALENDAR_ENTRY = """
mutation UpdateCalendarEntry(
  $id: Int!
  $title: String
  $date: String
  $time: String
  $description: String
  $mediaRefs: [CalendarMediaRefInput!]
  $sourceRef: CalendarSourceRefInput
) {
  updateCalendarEntry(
    id: $id
    title: $title
    date: $date
    time: $time
    description: $description
    mediaRefs: $mediaRefs
    sourceRef: $sourceRef
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
    sourceRef {
      type
      workflowId
      itemId
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
                "sourceRef": {
                    "type": "instagram_item",
                    "workflowId": "1",
                    "itemId": "2",
                },
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
                "sourceRef": {
                    "type": "instagram_item",
                    "workflowId": "1",
                    "itemId": "2",
                },
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
    assert entry["sourceRef"] == {
        "type": "instagram_item",
        "workflowId": "1",
        "itemId": "2",
    }


DELETE_CALENDAR_ENTRY = """
mutation DeleteCalendarEntry($id: Int!) {
  deleteCalendarEntry(id: $id) {
    id
    locationId
    title
  }
}
"""


def test_delete_calendar_entry():
    location_id = _create_location("Calendar Entry Delete")
    created = asyncio.run(
        schema.execute(
            CREATE_CALENDAR_ENTRY,
            variable_values={
                "locationId": location_id,
                "title": "To remove",
                "date": "2026-11-01",
                "time": "11:00",
            },
            context_value=graphql_auth_context(),
        )
    )
    assert not created.errors, created.errors
    entry_id = created.data["createCalendarEntry"]["id"]

    deleted = asyncio.run(
        schema.execute(
            DELETE_CALENDAR_ENTRY,
            variable_values={"id": entry_id},
            context_value=graphql_auth_context(),
        )
    )
    assert not deleted.errors, deleted.errors
    assert deleted.data["deleteCalendarEntry"]["id"] == entry_id
    assert deleted.data["deleteCalendarEntry"]["locationId"] == location_id

    calendar = asyncio.run(
        schema.execute(
            SCHEDULER_CALENDAR_QUERY,
            variable_values={"locationId": location_id},
            context_value=graphql_auth_context(),
        )
    )
    assert not calendar.errors, calendar.errors
    assert calendar.data["schedulerCalendar"]["slots"] == []


def test_delete_calendar_entry_not_found():
    result = asyncio.run(
        schema.execute(
            DELETE_CALENDAR_ENTRY,
            variable_values={"id": 999_999},
            context_value=graphql_auth_context(),
        )
    )
    assert result.errors
    assert "not found" in str(result.errors[0]).lower()
