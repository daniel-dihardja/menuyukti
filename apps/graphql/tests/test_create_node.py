import asyncio

from graphql.data_sources import Location, Node, SessionLocal
from graphql.schema import schema
from graphql.tests.auth_context import GRAPHQL_TEST_USER_ID, graphql_auth_context

CREATE_NODE = """
mutation CreateNode($locationId: Int!, $nodeType: String!, $name: String, $description: String, $data: JSON, $parentId: ID) {
  createNode(locationId: $locationId, nodeType: $nodeType, name: $name, description: $description, data: $data, parentId: $parentId) {
    id
    name
    description
    nodeType
    path
    parentId
    locationId
    data
  }
}
"""

_DEPRECATED_TYPES = ("milestonedata", "result", "passcriteria", "milestone", "goal", "workflow")


def _fresh_location(name: str) -> int:
    session = SessionLocal()
    try:
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


def test_create_node_inserts_root_note_node():
    location_id = _fresh_location("Campaign Test Location")

    result = asyncio.run(
        schema.execute(
            CREATE_NODE,
            variable_values={
                "locationId": location_id,
                "nodeType": "note",
                "name": None,
            },
            context_value=graphql_auth_context(),
        )
    )
    assert not result.errors, result.errors
    data = result.data["createNode"]
    assert data["parentId"] is None
    assert data["nodeType"] == "note"
    assert data["locationId"] == location_id
    assert data["name"]
    assert data["path"] == f"/{data['id']}"
    assert data["data"] is None
    assert data["description"] is None

    session = SessionLocal()
    try:
        row = session.get(Node, int(data["id"]))
        assert row is not None
        assert row.parent_id is None
        assert row.node_type == "note"
        assert row.location_id == location_id
        assert row.name == data["name"]
        assert row.data is None
        assert row.description is None
    finally:
        session.close()


def test_create_workflow_rejected():
    location_id = _fresh_location("Workflow Deprecated Location")

    result = asyncio.run(
        schema.execute(
            CREATE_NODE,
            variable_values={
                "locationId": location_id,
                "nodeType": "workflow",
                "name": "Should fail",
            },
            context_value=graphql_auth_context(),
        )
    )
    assert result.errors
    assert result.data is None or result.data.get("createNode") is None


def test_deprecated_child_node_types_rejected():
    """milestone / goal / milestonedata / result / passcriteria / workflow are no longer creatable."""
    location_id = _fresh_location("Deprecated Types Location")

    for nt in _DEPRECATED_TYPES:
        bad = asyncio.run(
            schema.execute(
                CREATE_NODE,
                variable_values={
                    "locationId": location_id,
                    "nodeType": nt,
                    "name": "X",
                },
                context_value=graphql_auth_context(),
            )
        )
        assert bad.errors, f"expected createNode to reject {nt!r}"
        assert bad.data is None or bad.data.get("createNode") is None


def test_create_node_with_json_data():
    location_id = _fresh_location("Campaign Test Location 2")

    payload = {"foo": "bar", "n": 1}
    result = asyncio.run(
        schema.execute(
            CREATE_NODE,
            variable_values={
                "locationId": location_id,
                "nodeType": "note",
                "name": "With data",
                "description": "A test campaign",
                "data": payload,
            },
            context_value=graphql_auth_context(),
        )
    )
    assert not result.errors, result.errors
    data = result.data["createNode"]
    assert data["data"] == payload
    assert data["description"] == "A test campaign"

    session = SessionLocal()
    try:
        row = session.get(Node, int(data["id"]))
        assert row is not None
        assert row.data == payload
        assert row.description == "A test campaign"
    finally:
        session.close()


def test_create_goal_node_type_rejected():
    location_id = _fresh_location("Goal Node Location")

    goal = asyncio.run(
        schema.execute(
            CREATE_NODE,
            variable_values={
                "locationId": location_id,
                "nodeType": "goal",
                "name": "Goal",
                "data": {"goal": "Launch promo"},
            },
            context_value=graphql_auth_context(),
        )
    )
    assert goal.errors


def test_create_milestonedata_rejected():
    location_id = _fresh_location("MilestoneData Node Location")

    md = asyncio.run(
        schema.execute(
            CREATE_NODE,
            variable_values={
                "locationId": location_id,
                "nodeType": "milestonedata",
                "name": "Data",
                "data": {"context": "context blob"},
            },
            context_value=graphql_auth_context(),
        )
    )
    assert md.errors


def test_create_milestone_node_type_rejected():
    location_id = _fresh_location("Milestone Reject Location")

    parent = asyncio.run(
        schema.execute(
            CREATE_NODE,
            variable_values={
                "locationId": location_id,
                "nodeType": "note",
                "name": "Parent",
            },
            context_value=graphql_auth_context(),
        )
    )
    assert not parent.errors, parent.errors
    parent_id = parent.data["createNode"]["id"]

    milestone = asyncio.run(
        schema.execute(
            CREATE_NODE,
            variable_values={
                "locationId": location_id,
                "nodeType": "milestone",
                "name": "M1",
                "parentId": parent_id,
            },
            context_value=graphql_auth_context(),
        )
    )
    assert milestone.errors
    assert milestone.data is None or milestone.data.get("createNode") is None
