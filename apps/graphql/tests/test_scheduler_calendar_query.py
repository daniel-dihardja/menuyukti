import asyncio

from graphql.data_sources import Location, Node, SessionLocal
from graphql.schema import schema
from graphql.tests.auth_context import GRAPHQL_TEST_USER_ID, graphql_auth_context
from graphql.tests.test_nodes_query import CREATE_NODE

UPDATE_NODE = """
mutation UpdateNode($id: ID!, $data: JSON) {
  updateNode(id: $id, data: $data) {
    id
    milestonePresetData
    data
  }
}
"""

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


def _create_location(name: str) -> int:
    session = SessionLocal()
    try:
        from graphql.data_sources.models.calendar_entry import CalendarEntry

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


def _create_workflow(location_id: int, name: str) -> str:
    result = asyncio.run(
        schema.execute(
            CREATE_NODE,
            variable_values={
                "locationId": location_id,
                "nodeType": "workflow",
                "name": name,
                "parentId": None,
            },
            context_value=graphql_auth_context(),
        )
    )
    assert not result.errors, result.errors
    return result.data["createNode"]["id"]


def _create_scheduler_milestone(
    *,
    location_id: int,
    workflow_id: str,
    name: str,
    preset_data: dict,
) -> str:
    created = asyncio.run(
        schema.execute(
            CREATE_NODE,
            variable_values={
                "locationId": location_id,
                "nodeType": "milestone",
                "name": name,
                "parentId": workflow_id,
            },
            context_value=graphql_auth_context(),
        )
    )
    assert not created.errors, created.errors
    milestone_id = created.data["createNode"]["id"]

    updated = asyncio.run(
        schema.execute(
            UPDATE_NODE,
            variable_values={
                "id": milestone_id,
                "data": {
                    "presetId": "scheduler",
                    "milestonePresetData": preset_data,
                },
            },
            context_value=graphql_auth_context(),
        )
    )
    assert not updated.errors, updated.errors
    return milestone_id


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


def test_scheduler_calendar_empty_when_no_scheduler_milestones():
    location_id = _create_location("Calendar Empty Location")
    workflow_id = _create_workflow(location_id, "Campaign")
    created = asyncio.run(
        schema.execute(
            CREATE_NODE,
            variable_values={
                "locationId": location_id,
                "nodeType": "milestone",
                "name": "Dates",
                "parentId": workflow_id,
            },
            context_value=graphql_auth_context(),
        )
    )
    assert not created.errors, created.errors
    asyncio.run(
        schema.execute(
            UPDATE_NODE,
            variable_values={
                "id": created.data["createNode"]["id"],
                "data": {
                    "presetId": "dates",
                    "milestonePresetData": {
                        "startDate": "2026-07-01",
                        "endDate": "2026-07-31",
                        "publicHolidays": [],
                    },
                },
            },
            context_value=graphql_auth_context(),
        )
    )

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


def test_scheduler_calendar_unions_windows_and_flattens_slots():
    location_id = _create_location("Calendar Aggregate Location")
    wf_a = _create_workflow(location_id, "Campaign A")
    wf_b = _create_workflow(location_id, "Campaign B")

    _create_scheduler_milestone(
        location_id=location_id,
        workflow_id=wf_a,
        name="Scheduler A",
        preset_data={
            "startDate": "2026-07-01",
            "endDate": "2026-07-15",
            "publicHolidays": [
                {"name": "Holiday A", "description": "A", "date": "2026-07-04"},
            ],
            "slots": [
                {
                    "kind": "post",
                    "date": "2026-07-02",
                    "time": "11:00",
                    "title": "Post: Lunch special",
                },
            ],
        },
    )
    _create_scheduler_milestone(
        location_id=location_id,
        workflow_id=wf_b,
        name="Scheduler B",
        preset_data={
            "startDate": "2026-07-10",
            "endDate": "2026-07-31",
            "publicHolidays": [
                {"name": "Holiday A", "description": "A", "date": "2026-07-04"},
                {"name": "Holiday B", "description": "B", "date": "2026-07-20"},
            ],
            "slots": [
                {
                    "kind": "reel",
                    "date": "2026-07-12",
                    "time": "18:00",
                    "title": "Reel: Weekend buzz",
                },
                {
                    "date": "2026-07-13",
                    "time": "09:00",
                    "title": "Story: Morning open",
                },
            ],
        },
    )

    result = asyncio.run(
        schema.execute(
            SCHEDULER_CALENDAR_QUERY,
            variable_values={"locationId": location_id},
            context_value=graphql_auth_context(),
        )
    )
    assert not result.errors, result.errors
    payload = result.data["schedulerCalendar"]
    assert payload["windowStart"] == "2026-07-01"
    assert payload["windowEnd"] == "2026-07-31"
    assert len(payload["publicHolidays"]) == 2
    assert {h["name"] for h in payload["publicHolidays"]} == {"Holiday A", "Holiday B"}
    assert len(payload["slots"]) == 3
    titles = {s["title"] for s in payload["slots"]}
    assert titles == {
        "Post: Lunch special",
        "Reel: Weekend buzz",
        "Story: Morning open",
    }


def test_scheduler_calendar_empty_for_other_user_location():
    session = SessionLocal()
    try:
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
