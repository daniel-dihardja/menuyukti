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
    nodeType
    parentId
  }
}
"""

NODES_BY_PARENT = """
query Nodes($locationId: Int!, $nodeType: String, $parentId: ID) {
  nodes(locationId: $locationId, nodeType: $nodeType, parentId: $parentId) {
    id
    name
  }
}
"""

DELETE_NODE = """
mutation DeleteNode($id: ID!) {
  deleteNode(id: $id)
}
"""


def test_delete_node_only_last_milestone():
    session = SessionLocal()
    try:
        session.query(Node).delete()
        session.query(Location).filter(Location.clerk_user_id == GRAPHQL_TEST_USER_ID).delete()
        session.commit()

        location = Location(name="Delete Node Location", clerk_user_id=GRAPHQL_TEST_USER_ID)
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
                "nodeType": "campaign",
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
                "name": "First",
                "parentId": campaign_id,
            },
            context_value=graphql_auth_context(),
        )
    )
    assert not first.errors, first.errors
    first_id = first.data["createNode"]["id"]

    second = asyncio.run(
        schema.execute(
            CREATE_NODE,
            variable_values={
                "locationId": location_id,
                "nodeType": "milestone",
                "name": "Second",
                "parentId": campaign_id,
            },
            context_value=graphql_auth_context(),
        )
    )
    assert not second.errors, second.errors
    second_id = second.data["createNode"]["id"]

    bad = asyncio.run(
        schema.execute(
            DELETE_NODE,
            variable_values={"id": first_id},
            context_value=graphql_auth_context(),
        )
    )
    assert bad.errors
    assert bad.data is None or bad.data.get("deleteNode") is None

    good = asyncio.run(
        schema.execute(
            DELETE_NODE,
            variable_values={"id": second_id},
            context_value=graphql_auth_context(),
        )
    )
    assert not good.errors, good.errors
    assert good.data["deleteNode"] is True

    listed = asyncio.run(
        schema.execute(
            NODES_BY_PARENT,
            variable_values={
                "locationId": location_id,
                "nodeType": "milestone",
                "parentId": campaign_id,
            },
            context_value=graphql_auth_context(),
        )
    )
    assert not listed.errors, listed.errors
    nodes = listed.data["nodes"]
    assert len(nodes) == 1
    assert nodes[0]["id"] == first_id
    assert nodes[0]["name"] == "First"


def test_delete_passcriteria_node():
    session = SessionLocal()
    try:
        session.query(Node).delete()
        session.query(Location).filter(Location.clerk_user_id == GRAPHQL_TEST_USER_ID).delete()
        session.commit()

        location = Location(name="Delete PC Location", clerk_user_id=GRAPHQL_TEST_USER_ID)
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
                "nodeType": "campaign",
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

    first_pc = asyncio.run(
        schema.execute(
            CREATE_NODE,
            variable_values={
                "locationId": location_id,
                "nodeType": "passcriteria",
                "name": "A",
                "parentId": milestone_id,
            },
            context_value=graphql_auth_context(),
        )
    )
    assert not first_pc.errors, first_pc.errors
    first_pc_id = first_pc.data["createNode"]["id"]

    second_pc = asyncio.run(
        schema.execute(
            CREATE_NODE,
            variable_values={
                "locationId": location_id,
                "nodeType": "passcriteria",
                "name": "B",
                "parentId": milestone_id,
            },
            context_value=graphql_auth_context(),
        )
    )
    assert not second_pc.errors, second_pc.errors
    second_pc_id = second_pc.data["createNode"]["id"]

    del_first = asyncio.run(
        schema.execute(
            DELETE_NODE,
            variable_values={"id": first_pc_id},
            context_value=graphql_auth_context(),
        )
    )
    assert not del_first.errors, del_first.errors
    assert del_first.data["deleteNode"] is True

    listed = asyncio.run(
        schema.execute(
            NODES_BY_PARENT,
            variable_values={
                "locationId": location_id,
                "nodeType": "passcriteria",
                "parentId": milestone_id,
            },
            context_value=graphql_auth_context(),
        )
    )
    assert not listed.errors, listed.errors
    nodes = listed.data["nodes"]
    assert len(nodes) == 1
    assert nodes[0]["id"] == second_pc_id
    assert nodes[0]["name"] == "B"


def test_delete_milestone_removes_goal_child():
    session = SessionLocal()
    try:
        session.query(Node).delete()
        session.query(Location).filter(Location.clerk_user_id == GRAPHQL_TEST_USER_ID).delete()
        session.commit()

        location = Location(name="Delete Goal Cascade Location", clerk_user_id=GRAPHQL_TEST_USER_ID)
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
                "nodeType": "campaign",
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
                "name": "Only",
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
                "data": {"goal": "Keep me"},
            },
            context_value=graphql_auth_context(),
        )
    )
    assert not goal.errors, goal.errors
    goal_id = int(goal.data["createNode"]["id"])

    deleted = asyncio.run(
        schema.execute(
            DELETE_NODE,
            variable_values={"id": milestone_id},
            context_value=graphql_auth_context(),
        )
    )
    assert not deleted.errors, deleted.errors
    assert deleted.data["deleteNode"] is True

    session = SessionLocal()
    try:
        assert session.get(Node, goal_id) is None
    finally:
        session.close()
