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


def test_update_workflow_name_and_data():
    location_id = _fresh_location("Update Workflow Location")

    created = asyncio.run(
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
    assert not created.errors, created.errors
    workflow_id = created.data["createNode"]["id"]

    updated = asyncio.run(
        schema.execute(
            UPDATE_NODE,
            variable_values={
                "id": workflow_id,
                "name": "Renamed Campaign",
                "data": {"phase": "draft"},
            },
            context_value=graphql_auth_context(),
        )
    )
    assert not updated.errors, updated.errors
    out = updated.data["updateNode"]
    assert out["name"] == "Renamed Campaign"
    assert out["nodeType"] == "workflow"
    assert out["data"] == {"phase": "draft"}

    again = asyncio.run(
        schema.execute(
            UPDATE_NODE,
            variable_values={
                "id": workflow_id,
                "data": {"phase": "live", "note": "shipped"},
            },
            context_value=graphql_auth_context(),
        )
    )
    assert not again.errors, again.errors
    assert again.data["updateNode"]["data"] == {"phase": "live", "note": "shipped"}


def test_get_handler_strips_node_type_for_lookup():
    from graphql.schema.node_handlers import GenericHandler, WorkflowHandler, get_handler

    assert isinstance(get_handler("  workflow  "), WorkflowHandler)
    assert isinstance(get_handler("  unknown  "), GenericHandler)
    assert isinstance(get_handler("  milestone  "), GenericHandler)
