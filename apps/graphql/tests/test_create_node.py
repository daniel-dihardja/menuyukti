import asyncio
import uuid

from graphql.data_sources import Location, Node, SessionLocal
from graphql.schema import schema
from graphql.tests.auth_context import GRAPHQL_TEST_USER_ID, graphql_auth_context

CREATE_NODE = """
mutation CreateNode($locationId: Int!, $nodeType: String!, $name: String) {
  createNode(locationId: $locationId, nodeType: $nodeType, name: $name) {
    id
    name
    nodeType
    path
    parentId
    locationId
  }
}
"""


def test_create_node_inserts_root_campaign_node():
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
                "nodeType": "campaign",
                "name": None,
            },
            context_value=graphql_auth_context(),
        )
    )
    assert not result.errors, result.errors
    data = result.data["createNode"]
    assert data["parentId"] is None
    assert data["nodeType"] == "campaign"
    assert data["locationId"] == location_id
    assert data["name"]
    assert data["path"] == f"/{data['id']}"

    session = SessionLocal()
    try:
        row = session.get(Node, uuid.UUID(str(data["id"])))
        assert row is not None
        assert row.parent_id is None
        assert row.node_type == "campaign"
        assert row.location_id == location_id
        assert row.name == data["name"]
    finally:
        session.close()
