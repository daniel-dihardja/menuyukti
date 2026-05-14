"""Goal text is stored on ``milestone_goal`` when seeding from a template payload."""

from __future__ import annotations

import asyncio

from graphql.data_sources import Location, Node, SessionLocal
from graphql.schema import schema
from graphql.tests.auth_context import GRAPHQL_TEST_USER_ID, graphql_auth_context

CREATE_WORKFLOW_FROM_PAYLOAD = """
mutation CreateWorkflowFromPayload($locationId: Int!, $payload: JSON!) {
  createWorkflowFromPayload(locationId: $locationId, payload: $payload) {
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


def test_create_workflow_from_payload_stores_goal_on_milestone_row_not_child():
    session = SessionLocal()
    try:
        session.query(Node).delete()
        session.query(Location).filter(Location.clerk_user_id == GRAPHQL_TEST_USER_ID).delete()
        session.commit()

        location = Location(name="Seed Goal Location", clerk_user_id=GRAPHQL_TEST_USER_ID)
        session.add(location)
        session.commit()
        session.refresh(location)
        location_id = location.id
    finally:
        session.close()

    payload = {
        "workflowName": "Seeded WF",
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
            CREATE_WORKFLOW_FROM_PAYLOAD,
            variable_values={"locationId": location_id, "payload": payload},
            context_value=graphql_auth_context(),
        )
    )
    assert not imp.errors, imp.errors
    root_id = imp.data["createWorkflowFromPayload"]["id"]

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
