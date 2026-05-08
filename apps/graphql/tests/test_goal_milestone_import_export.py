"""Goal text is stored on ``milestone_goal`` (import/export round-trip)."""

from __future__ import annotations

import asyncio

from graphql.data_sources import Location, Node, SessionLocal
from graphql.schema import schema
from graphql.tests.auth_context import GRAPHQL_TEST_USER_ID, graphql_auth_context

IMPORT_WORKFLOW = """
mutation ImportWorkflow($locationId: Int!, $payload: JSON!) {
  importWorkflow(locationId: $locationId, payload: $payload) {
    id
    nodeType
  }
}
"""

NODE_BY_ID = """
query NodeById($id: ID!) {
  node(id: $id) {
    id
    milestoneGoal
    data
  }
}
"""

NODES_UNDER_ROOT = """
query N($locationId: Int!, $parentId: ID!) {
  nodes(locationId: $locationId, parentId: $parentId, first: 50) {
    id
    nodeType
    data
  }
}
"""

EXPORT_WORKFLOW = """
mutation ExportWorkflow($workflowId: ID!, $locationId: Int!) {
  exportWorkflow(workflowId: $workflowId, locationId: $locationId) {
    payload
    schemaVersion
  }
}
"""


def test_import_workflow_stores_goal_on_milestone_row_not_child():
    session = SessionLocal()
    try:
        session.query(Node).delete()
        session.query(Location).filter(Location.clerk_user_id == GRAPHQL_TEST_USER_ID).delete()
        session.commit()

        location = Location(name="Import Goal Location", clerk_user_id=GRAPHQL_TEST_USER_ID)
        session.add(location)
        session.commit()
        session.refresh(location)
        location_id = location.id
    finally:
        session.close()

    payload = {
        "workflowName": "Imported WF",
        "milestones": [
            {
                "title": "M1",
                "order": 0,
                "goal": "  Grow brunch bookings  ",
                "passCriteria": [],
            }
        ],
    }

    imp = asyncio.run(
        schema.execute(
            IMPORT_WORKFLOW,
            variable_values={"locationId": location_id, "payload": payload},
            context_value=graphql_auth_context(),
        )
    )
    assert not imp.errors, imp.errors
    root_id = imp.data["importWorkflow"]["id"]

    listed = asyncio.run(
        schema.execute(
            NODES_UNDER_ROOT,
            variable_values={"locationId": location_id, "parentId": root_id},
            context_value=graphql_auth_context(),
        )
    )
    assert not listed.errors, listed.errors
    children = listed.data["nodes"]
    milestones = [n for n in children if n.get("nodeType") == "milestone"]
    assert len(milestones) == 1
    mid = milestones[0]["id"]

    loaded = asyncio.run(
        schema.execute(
            NODE_BY_ID,
            variable_values={"id": mid},
            context_value=graphql_auth_context(),
        )
    )
    assert not loaded.errors, loaded.errors
    assert loaded.data["node"]["milestoneGoal"] == "Grow brunch bookings"
    goal_children = [n for n in children if n.get("nodeType") == "goal"]
    assert goal_children == []


def test_export_workflow_includes_goal_from_milestone_data():
    session = SessionLocal()
    try:
        session.query(Node).delete()
        session.query(Location).filter(Location.clerk_user_id == GRAPHQL_TEST_USER_ID).delete()
        session.commit()

        location = Location(name="Export Goal Location", clerk_user_id=GRAPHQL_TEST_USER_ID)
        session.add(location)
        session.commit()
        session.refresh(location)
        location_id = location.id
    finally:
        session.close()

    payload = {
        "workflowName": "Round trip",
        "milestones": [
            {
                "title": "Alpha",
                "order": 0,
                "goal": "Ship v1",
                "passCriteria": [],
            }
        ],
    }

    imp = asyncio.run(
        schema.execute(
            IMPORT_WORKFLOW,
            variable_values={"locationId": location_id, "payload": payload},
            context_value=graphql_auth_context(),
        )
    )
    assert not imp.errors, imp.errors
    workflow_id = imp.data["importWorkflow"]["id"]

    out = asyncio.run(
        schema.execute(
            EXPORT_WORKFLOW,
            variable_values={"workflowId": workflow_id, "locationId": location_id},
            context_value=graphql_auth_context(),
        )
    )
    assert not out.errors, out.errors
    row = out.data["exportWorkflow"]
    assert row["schemaVersion"] == "3.0"
    exported = row["payload"]
    assert isinstance(exported, dict)
    ms = exported.get("milestones")
    assert isinstance(ms, list) and len(ms) == 1
    assert ms[0].get("goal") == "Ship v1"
