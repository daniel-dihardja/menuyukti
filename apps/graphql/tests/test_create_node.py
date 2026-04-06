import asyncio

from graphql.data_sources import Location, Node, SessionLocal
from graphql.schema import schema
from graphql.tests.auth_context import GRAPHQL_TEST_USER_ID, graphql_auth_context

CREATE_NODE = """
mutation CreateNode($locationId: Int!, $nodeType: String!, $name: String, $description: String, $data: JSON) {
  createNode(locationId: $locationId, nodeType: $nodeType, name: $name, description: $description, data: $data) {
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
    assert data["data"] is None
    assert data["description"] is None

    session = SessionLocal()
    try:
        row = session.get(Node, int(data["id"]))
        assert row is not None
        assert row.parent_id is None
        assert row.node_type == "campaign"
        assert row.location_id == location_id
        assert row.name == data["name"]
        assert row.data is None
        assert row.description is None
    finally:
        session.close()


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
                "nodeType": "campaign",
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
