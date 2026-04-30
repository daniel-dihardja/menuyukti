import asyncio

from graphql.data_sources import Location, Node, SessionLocal
from graphql.schema import schema
from graphql.tests.auth_context import GRAPHQL_TEST_USER_ID, graphql_auth_context

CREATE_NODE = """
mutation CreateNode(
  $locationId: Int!
  $nodeType: String!
  $name: String
  $parentId: ID
) {
  createNode(
    locationId: $locationId
    nodeType: $nodeType
    name: $name
    parentId: $parentId
  ) {
    id
    name
    nodeType
  }
}
"""

UPDATE_NODE = """
mutation UpdateNode($id: ID!, $name: String, $data: JSON) {
  updateNode(id: $id, name: $name, data: $data) {
    id
    name
    nodeType
    data
  }
}
"""


def test_update_milestone_name():
    session = SessionLocal()
    try:
        session.query(Node).delete()
        session.query(Location).filter(Location.clerk_user_id == GRAPHQL_TEST_USER_ID).delete()
        session.commit()

        location = Location(name="Update Node Location", clerk_user_id=GRAPHQL_TEST_USER_ID)
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

    first = asyncio.run(
        schema.execute(
            CREATE_NODE,
            variable_values={
                "locationId": location_id,
                "nodeType": "milestone",
                "name": "Original",
                "parentId": campaign_id,
            },
            context_value=graphql_auth_context(),
        )
    )
    assert not first.errors, first.errors
    milestone_id = first.data["createNode"]["id"]

    updated = asyncio.run(
        schema.execute(
            UPDATE_NODE,
            variable_values={"id": milestone_id, "name": "  Renamed title  "},
            context_value=graphql_auth_context(),
        )
    )
    assert not updated.errors, updated.errors
    data = updated.data["updateNode"]
    assert data["id"] == milestone_id
    assert data["name"] == "Renamed title"
    assert data["nodeType"] == "milestone"
    assert data["data"] == {"order": 1}


CREATE_PASSCRITERIA = """
mutation CreateNode(
  $locationId: Int!
  $nodeType: String!
  $name: String
  $parentId: ID
) {
  createNode(
    locationId: $locationId
    nodeType: $nodeType
    name: $name
    parentId: $parentId
  ) {
    id
    nodeType
    data
  }
}
"""


def test_update_passcriteria_node_data():
    session = SessionLocal()
    try:
        session.query(Node).delete()
        session.query(Location).filter(Location.clerk_user_id == GRAPHQL_TEST_USER_ID).delete()
        session.commit()

        location = Location(name="Update PC Location", clerk_user_id=GRAPHQL_TEST_USER_ID)
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

    first = asyncio.run(
        schema.execute(
            CREATE_NODE,
            variable_values={
                "locationId": location_id,
                "nodeType": "milestone",
                "name": "M",
                "parentId": campaign_id,
            },
            context_value=graphql_auth_context(),
        )
    )
    assert not first.errors, first.errors
    milestone_id = first.data["createNode"]["id"]

    pc = asyncio.run(
        schema.execute(
            CREATE_PASSCRITERIA,
            variable_values={
                "locationId": location_id,
                "nodeType": "passcriteria",
                "name": "PC1",
                "parentId": milestone_id,
            },
            context_value=graphql_auth_context(),
        )
    )
    assert not pc.errors, pc.errors
    pc_id = pc.data["createNode"]["id"]

    updated = asyncio.run(
        schema.execute(
            UPDATE_NODE,
            variable_values={
                "id": pc_id,
                "data": {"requirement": "Ship feature", "status": "pass"},
            },
            context_value=graphql_auth_context(),
        )
    )
    assert not updated.errors, updated.errors
    out = updated.data["updateNode"]
    assert out["data"]["requirement"] == "Ship feature"
    assert out["data"]["status"] == "pass"


CREATE_GOAL = """
mutation CreateNode(
  $locationId: Int!
  $nodeType: String!
  $name: String
  $parentId: ID
  $data: JSON
) {
  createNode(
    locationId: $locationId
    nodeType: $nodeType
    name: $name
    parentId: $parentId
    data: $data
  ) {
    id
    nodeType
    data
  }
}
"""


def test_update_goal_node_data():
    session = SessionLocal()
    try:
        session.query(Node).delete()
        session.query(Location).filter(Location.clerk_user_id == GRAPHQL_TEST_USER_ID).delete()
        session.commit()

        location = Location(name="Update Goal Location", clerk_user_id=GRAPHQL_TEST_USER_ID)
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
                "name": "M",
                "parentId": campaign_id,
            },
            context_value=graphql_auth_context(),
        )
    )
    assert not milestone.errors, milestone.errors
    milestone_id = milestone.data["createNode"]["id"]

    g = asyncio.run(
        schema.execute(
            CREATE_GOAL,
            variable_values={
                "locationId": location_id,
                "nodeType": "goal",
                "name": "Goal",
                "parentId": milestone_id,
                "data": {"goal": "First"},
            },
            context_value=graphql_auth_context(),
        )
    )
    assert not g.errors, g.errors
    goal_id = g.data["createNode"]["id"]

    updated = asyncio.run(
        schema.execute(
            UPDATE_NODE,
            variable_values={"id": goal_id, "data": {"goal": "Second draft"}},
            context_value=graphql_auth_context(),
        )
    )
    assert not updated.errors, updated.errors
    out = updated.data["updateNode"]
    assert out["data"]["goal"] == "Second draft"


def test_update_milestonedata_node_data():
    session = SessionLocal()
    try:
        session.query(Node).delete()
        session.query(Location).filter(Location.clerk_user_id == GRAPHQL_TEST_USER_ID).delete()
        session.commit()

        location = Location(
            name="Update MilestoneData Location", clerk_user_id=GRAPHQL_TEST_USER_ID
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
                "name": "M",
                "parentId": campaign_id,
            },
            context_value=graphql_auth_context(),
        )
    )
    assert not milestone.errors, milestone.errors
    milestone_id = milestone.data["createNode"]["id"]

    g = asyncio.run(
        schema.execute(
            CREATE_GOAL,
            variable_values={
                "locationId": location_id,
                "nodeType": "milestonedata",
                "name": "Data",
                "parentId": milestone_id,
                "data": {"phase": "First"},
            },
            context_value=graphql_auth_context(),
        )
    )
    assert not g.errors, g.errors
    node_id = g.data["createNode"]["id"]

    updated = asyncio.run(
        schema.execute(
            UPDATE_NODE,
            variable_values={"id": node_id, "data": {"phase": "Second draft"}},
            context_value=graphql_auth_context(),
        )
    )
    assert not updated.errors, updated.errors
    out = updated.data["updateNode"]
    assert out["data"]["phase"] == "Second draft"


def test_get_handler_strips_node_type_for_lookup():
    from graphql.schema.node_handlers import get_handler
    from graphql.schema.node_handlers.goal import GoalHandler

    assert isinstance(get_handler("  goal  "), GoalHandler)
