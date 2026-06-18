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

UPDATE_NODE = """
mutation UpdateNode($id: ID!, $data: JSON!) {
  updateNode(id: $id, data: $data) {
    id
    milestoneResult
  }
}
"""


def test_create_node_inserts_root_workflow_node():
    session = SessionLocal()
    try:
        session.query(Node).delete()
        session.query(Location).filter(Location.clerk_user_id == GRAPHQL_TEST_USER_ID).delete()
        session.commit()

        location = Location(name="Campaign Test Location", clerk_user_id=GRAPHQL_TEST_USER_ID)
        session.add(location)
        session.commit()
        session.refresh(location)
        location_id = location.id
    finally:
        session.close()

    result = asyncio.run(
        schema.execute(
            CREATE_NODE,
            variable_values={
                "locationId": location_id,
                "nodeType": "workflow",
                "name": None,
            },
            context_value=graphql_auth_context(),
        )
    )
    assert not result.errors, result.errors
    data = result.data["createNode"]
    assert data["parentId"] is None
    assert data["nodeType"] == "workflow"
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
        assert row.node_type == "workflow"
        assert row.location_id == location_id
        assert row.name == data["name"]
        assert row.data is None
        assert row.description is None
    finally:
        session.close()


def test_create_workflow_rejects_parent_node():
    session = SessionLocal()
    try:
        session.query(Node).delete()
        session.query(Location).filter(Location.clerk_user_id == GRAPHQL_TEST_USER_ID).delete()
        session.commit()

        location = Location(
            name="Workflow Parent Guard Location", clerk_user_id=GRAPHQL_TEST_USER_ID
        )
        session.add(location)
        session.commit()
        session.refresh(location)
        location_id = location.id

        loc_root = Node(
            parent_id=None,
            name="Loc root",
            description=None,
            path="",
            node_type="location",
            location_id=location_id,
            data=None,
        )
        session.add(loc_root)
        session.flush()
        loc_root.path = f"/{loc_root.id}"
        session.commit()
        location_node_id = str(loc_root.id)
    finally:
        session.close()

    result = asyncio.run(
        schema.execute(
            CREATE_NODE,
            variable_values={
                "locationId": location_id,
                "nodeType": "workflow",
                "name": "Should fail",
                "parentId": location_node_id,
            },
            context_value=graphql_auth_context(),
        )
    )
    assert result.errors
    assert result.data is None or result.data.get("createNode") is None


def test_create_milestone_sets_order_in_data_json():
    session = SessionLocal()
    try:
        session.query(Node).delete()
        session.query(Location).filter(Location.clerk_user_id == GRAPHQL_TEST_USER_ID).delete()
        session.commit()

        location = Location(
            name="Milestone Default Data Location", clerk_user_id=GRAPHQL_TEST_USER_ID
        )
        session.add(location)
        session.commit()
        session.refresh(location)
        location_id = location.id
    finally:
        session.close()

    campaign = asyncio.run(
        schema.execute(
            CREATE_NODE,
            variable_values={
                "locationId": location_id,
                "nodeType": "workflow",
                "name": "Campaign",
                "parentId": None,
            },
            context_value=graphql_auth_context(),
        )
    )
    assert not campaign.errors, campaign.errors
    campaign_id = campaign.data["createNode"]["id"]

    milestone = asyncio.run(
        schema.execute(
            CREATE_NODE,
            variable_values={
                "locationId": location_id,
                "nodeType": "milestone",
                "name": "M1",
                "parentId": campaign_id,
            },
            context_value=graphql_auth_context(),
        )
    )
    assert not milestone.errors, milestone.errors
    data = milestone.data["createNode"]
    assert data["data"] == {"order": 1}


def test_deprecated_child_node_types_rejected():
    """milestonedata / result / passcriteria rows are no longer created."""
    session = SessionLocal()
    try:
        session.query(Node).delete()
        session.query(Location).filter(Location.clerk_user_id == GRAPHQL_TEST_USER_ID).delete()
        session.commit()

        location = Location(name="Passcriteria Parent Location", clerk_user_id=GRAPHQL_TEST_USER_ID)
        session.add(location)
        session.commit()
        session.refresh(location)
        location_id = location.id
    finally:
        session.close()

    bad = asyncio.run(
        schema.execute(
            CREATE_NODE,
            variable_values={
                "locationId": location_id,
                "nodeType": "passcriteria",
                "name": "PC",
            },
            context_value=graphql_auth_context(),
        )
    )
    assert bad.errors

    campaign = asyncio.run(
        schema.execute(
            CREATE_NODE,
            variable_values={
                "locationId": location_id,
                "nodeType": "workflow",
                "name": "Campaign",
            },
            context_value=graphql_auth_context(),
        )
    )
    assert not campaign.errors, campaign.errors
    campaign_id = campaign.data["createNode"]["id"]

    bad_parent = asyncio.run(
        schema.execute(
            CREATE_NODE,
            variable_values={
                "locationId": location_id,
                "nodeType": "passcriteria",
                "name": "PC",
                "parentId": campaign_id,
            },
            context_value=graphql_auth_context(),
        )
    )
    assert bad_parent.errors

    milestone = asyncio.run(
        schema.execute(
            CREATE_NODE,
            variable_values={
                "locationId": location_id,
                "nodeType": "milestone",
                "name": "M1",
                "parentId": campaign_id,
            },
            context_value=graphql_auth_context(),
        )
    )
    assert not milestone.errors, milestone.errors
    milestone_id = milestone.data["createNode"]["id"]

    for nt in ("passcriteria", "milestonedata", "result"):
        pc = asyncio.run(
            schema.execute(
                CREATE_NODE,
                variable_values={
                    "locationId": location_id,
                    "nodeType": nt,
                    "name": "X",
                    "parentId": milestone_id,
                },
                context_value=graphql_auth_context(),
            )
        )
        assert pc.errors


def test_create_node_with_json_data():
    session = SessionLocal()
    try:
        session.query(Node).delete()
        session.query(Location).filter(Location.clerk_user_id == GRAPHQL_TEST_USER_ID).delete()
        session.commit()

        location = Location(name="Campaign Test Location 2", clerk_user_id=GRAPHQL_TEST_USER_ID)
        session.add(location)
        session.commit()
        session.refresh(location)
        location_id = location.id
    finally:
        session.close()

    payload = {"foo": "bar", "n": 1}
    result = asyncio.run(
        schema.execute(
            CREATE_NODE,
            variable_values={
                "locationId": location_id,
                "nodeType": "workflow",
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
    session = SessionLocal()
    try:
        session.query(Node).delete()
        session.query(Location).filter(Location.clerk_user_id == GRAPHQL_TEST_USER_ID).delete()
        session.commit()

        location = Location(name="Goal Node Location", clerk_user_id=GRAPHQL_TEST_USER_ID)
        session.add(location)
        session.commit()
        session.refresh(location)
        location_id = location.id
    finally:
        session.close()

    campaign = asyncio.run(
        schema.execute(
            CREATE_NODE,
            variable_values={
                "locationId": location_id,
                "nodeType": "workflow",
                "name": "Campaign",
            },
            context_value=graphql_auth_context(),
        )
    )
    assert not campaign.errors, campaign.errors
    campaign_id = campaign.data["createNode"]["id"]

    milestone = asyncio.run(
        schema.execute(
            CREATE_NODE,
            variable_values={
                "locationId": location_id,
                "nodeType": "milestone",
                "name": "M1",
                "parentId": campaign_id,
            },
            context_value=graphql_auth_context(),
        )
    )
    assert not milestone.errors, milestone.errors
    milestone_id = milestone.data["createNode"]["id"]

    goal = asyncio.run(
        schema.execute(
            CREATE_NODE,
            variable_values={
                "locationId": location_id,
                "nodeType": "goal",
                "name": "Goal",
                "parentId": milestone_id,
                "data": {"goal": "Launch promo"},
            },
            context_value=graphql_auth_context(),
        )
    )
    assert goal.errors


def test_create_milestonedata_under_milestone_rejected():
    session = SessionLocal()
    try:
        session.query(Node).delete()
        session.query(Location).filter(Location.clerk_user_id == GRAPHQL_TEST_USER_ID).delete()
        session.commit()

        location = Location(name="MilestoneData Node Location", clerk_user_id=GRAPHQL_TEST_USER_ID)
        session.add(location)
        session.commit()
        session.refresh(location)
        location_id = location.id
    finally:
        session.close()

    campaign = asyncio.run(
        schema.execute(
            CREATE_NODE,
            variable_values={
                "locationId": location_id,
                "nodeType": "workflow",
                "name": "Campaign",
            },
            context_value=graphql_auth_context(),
        )
    )
    assert not campaign.errors, campaign.errors
    campaign_id = campaign.data["createNode"]["id"]

    milestone = asyncio.run(
        schema.execute(
            CREATE_NODE,
            variable_values={
                "locationId": location_id,
                "nodeType": "milestone",
                "name": "M1",
                "parentId": campaign_id,
            },
            context_value=graphql_auth_context(),
        )
    )
    assert not milestone.errors, milestone.errors
    milestone_id = milestone.data["createNode"]["id"]

    md = asyncio.run(
        schema.execute(
            CREATE_NODE,
            variable_values={
                "locationId": location_id,
                "nodeType": "milestonedata",
                "name": "Data",
                "parentId": milestone_id,
                "data": {"context": "context blob"},
            },
            context_value=graphql_auth_context(),
        )
    )
    assert md.errors


def test_create_second_milestonedata_rejected():
    session = SessionLocal()
    try:
        session.query(Node).delete()
        session.query(Location).filter(Location.clerk_user_id == GRAPHQL_TEST_USER_ID).delete()
        session.commit()

        location = Location(name="MilestoneData Dup Location", clerk_user_id=GRAPHQL_TEST_USER_ID)
        session.add(location)
        session.commit()
        session.refresh(location)
        location_id = location.id
    finally:
        session.close()

    campaign = asyncio.run(
        schema.execute(
            CREATE_NODE,
            variable_values={
                "locationId": location_id,
                "nodeType": "workflow",
                "name": "Campaign",
            },
            context_value=graphql_auth_context(),
        )
    )
    assert not campaign.errors, campaign.errors
    campaign_id = campaign.data["createNode"]["id"]

    milestone = asyncio.run(
        schema.execute(
            CREATE_NODE,
            variable_values={
                "locationId": location_id,
                "nodeType": "milestone",
                "name": "M1",
                "parentId": campaign_id,
            },
            context_value=graphql_auth_context(),
        )
    )
    assert not milestone.errors, milestone.errors
    milestone_id = milestone.data["createNode"]["id"]

    first = asyncio.run(
        schema.execute(
            CREATE_NODE,
            variable_values={
                "locationId": location_id,
                "nodeType": "milestonedata",
                "name": "Data",
                "parentId": milestone_id,
                "data": {"tag": "A"},
            },
            context_value=graphql_auth_context(),
        )
    )
    assert first.errors

    second = asyncio.run(
        schema.execute(
            CREATE_NODE,
            variable_values={
                "locationId": location_id,
                "nodeType": "milestonedata",
                "name": "Data2",
                "parentId": milestone_id,
                "data": {"tag": "B"},
            },
            context_value=graphql_auth_context(),
        )
    )
    assert second.errors


def test_update_milestone_result_overwrites_prior_eval():
    """Eval output is stored on ``milestone_result``; repeated writes replace in place."""
    session = SessionLocal()
    try:
        session.query(Node).delete()
        session.query(Location).filter(Location.clerk_user_id == GRAPHQL_TEST_USER_ID).delete()
        session.commit()

        location = Location(name="Result Replace Location", clerk_user_id=GRAPHQL_TEST_USER_ID)
        session.add(location)
        session.commit()
        session.refresh(location)
        location_id = location.id
    finally:
        session.close()

    campaign = asyncio.run(
        schema.execute(
            CREATE_NODE,
            variable_values={
                "locationId": location_id,
                "nodeType": "workflow",
                "name": "Campaign",
            },
            context_value=graphql_auth_context(),
        )
    )
    assert not campaign.errors, campaign.errors
    campaign_id = campaign.data["createNode"]["id"]

    milestone = asyncio.run(
        schema.execute(
            CREATE_NODE,
            variable_values={
                "locationId": location_id,
                "nodeType": "milestone",
                "name": "M1",
                "parentId": campaign_id,
            },
            context_value=graphql_auth_context(),
        )
    )
    assert not milestone.errors, milestone.errors
    milestone_id = milestone.data["createNode"]["id"]

    payload_v1 = {
        "summary": "First",
        "passed": 1,
        "total": 1,
        "criteria": [],
    }
    first = asyncio.run(
        schema.execute(
            UPDATE_NODE,
            variable_values={
                "id": milestone_id,
                "data": {"milestoneResult": payload_v1},
            },
            context_value=graphql_auth_context(),
        )
    )
    assert not first.errors, first.errors

    payload_v2 = {
        "summary": "Second run",
        "passed": 0,
        "total": 1,
        "criteria": [],
    }
    second = asyncio.run(
        schema.execute(
            UPDATE_NODE,
            variable_values={
                "id": milestone_id,
                "data": {"milestoneResult": payload_v2},
            },
            context_value=graphql_auth_context(),
        )
    )
    assert not second.errors, second.errors
    assert second.data["updateNode"]["milestoneResult"]["summary"] == "Second run"

    session = SessionLocal()
    try:
        row = session.get(Node, int(milestone_id))
        assert row is not None
        assert isinstance(row.milestone_result, dict)
        assert row.milestone_result.get("summary") == "Second run"
        count = (
            session.query(Node)
            .filter(Node.parent_id == int(milestone_id), Node.node_type == "result")
            .count()
        )
        assert count == 0
    finally:
        session.close()
