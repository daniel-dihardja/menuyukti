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
