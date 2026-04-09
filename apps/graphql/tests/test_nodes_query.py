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
