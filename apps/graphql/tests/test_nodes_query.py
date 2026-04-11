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
    locationId
  }
}
"""

NODES_BY_PARENT = """
query Nodes($locationId: Int!, $nodeType: String, $parentId: ID) {
  nodes(locationId: $locationId, nodeType: $nodeType, parentId: $parentId) {
    id
    name
    nodeType
    parentId
  }
}
"""


def test_nodes_filters_by_parent_id_and_returns_milestone_children():
    session = SessionLocal()
    try:
        session.query(Node).delete()
        session.query(Location).filter(Location.clerk_user_id == GRAPHQL_TEST_USER_ID).delete()
        session.commit()

        location = Location(name="Nodes Query Location", clerk_user_id=GRAPHQL_TEST_USER_ID)
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
                "name": "Test Campaign",
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
                "name": "Step one",
                "parentId": campaign_id,
            },
            context_value=graphql_auth_context(),
        )
    )
    assert not milestone.errors, milestone.errors
    m_data = milestone.data["createNode"]
    assert m_data["parentId"] == campaign_id
    assert m_data["nodeType"] == "milestone"

    # Other campaign's milestone should not appear
    campaign2 = asyncio.run(
        schema.execute(
            CREATE_NODE,
            variable_values={
                "locationId": location_id,
                "nodeType": "workflow",
                "name": "Other Campaign",
                "parentId": None,
            },
            context_value=graphql_auth_context(),
        )
    )
    assert not campaign2.errors, campaign2.errors
    other_id = campaign2.data["createNode"]["id"]
    asyncio.run(
        schema.execute(
            CREATE_NODE,
            variable_values={
                "locationId": location_id,
                "nodeType": "milestone",
                "name": "Other step",
                "parentId": other_id,
            },
            context_value=graphql_auth_context(),
        )
    )

    result = asyncio.run(
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
    assert not result.errors, result.errors
    nodes = result.data["nodes"]
    assert len(nodes) == 1
    assert nodes[0]["id"] == m_data["id"]
    assert nodes[0]["name"] == "Step one"
    assert nodes[0]["parentId"] == campaign_id


def test_nodes_respects_first_and_after_cursor():
    session = SessionLocal()
    try:
        session.query(Node).delete()
        session.query(Location).filter(Location.clerk_user_id == GRAPHQL_TEST_USER_ID).delete()
        session.commit()

        location = Location(name="Cursor Location", clerk_user_id=GRAPHQL_TEST_USER_ID)
        session.add(location)
        session.commit()
        session.refresh(location)
        location_id = location.id
    finally:
        session.close()

    async def _create_workflow(name: str) -> str:
        r = await schema.execute(
            CREATE_NODE,
            variable_values={
                "locationId": location_id,
                "nodeType": "workflow",
                "name": name,
                "parentId": None,
            },
            context_value=graphql_auth_context(),
        )
        assert not r.errors, r.errors
        return r.data["createNode"]["id"]

    w1 = asyncio.run(_create_workflow("W1"))
    w2 = asyncio.run(_create_workflow("W2"))

    page1 = asyncio.run(
        schema.execute(
            """
            query N($locationId: Int!, $first: Int) {
              nodes(locationId: $locationId, first: $first) { id name }
            }
            """,
            variable_values={"locationId": location_id, "first": 1},
            context_value=graphql_auth_context(),
        )
    )
    assert not page1.errors, page1.errors
    nodes1 = page1.data["nodes"]
    assert len(nodes1) == 1

    page2 = asyncio.run(
        schema.execute(
            """
            query N($locationId: Int!, $first: Int, $afterId: ID) {
              nodes(locationId: $locationId, first: $first, afterId: $afterId) { id name }
            }
            """,
            variable_values={"locationId": location_id, "first": 10, "afterId": nodes1[0]["id"]},
            context_value=graphql_auth_context(),
        )
    )
    assert not page2.errors, page2.errors
    nodes2 = page2.data["nodes"]
    assert len(nodes2) == 1
    assert nodes2[0]["id"] != nodes1[0]["id"]
    ids = {nodes1[0]["id"], nodes2[0]["id"]}
    assert ids == {w1, w2}
