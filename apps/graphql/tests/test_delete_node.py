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

DELETE_NODE = """
mutation DeleteNode($id: ID!) {
  deleteNode(id: $id)
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


def _insert_root_node(*, location_id: int, name: str, node_type: str = "note") -> int:
    session = SessionLocal()
    try:
        row = Node(
            parent_id=None,
            name=name,
            description=None,
            path="",
            node_type=node_type,
            location_id=location_id,
            data=None,
        )
        session.add(row)
        session.flush()
        row.path = f"/{row.id}"
        session.commit()
        session.refresh(row)
        return row.id
    finally:
        session.close()


def _insert_child_note(
    *,
    location_id: int,
    parent_id: int,
    name: str,
    data: dict | None = None,
) -> int:
    session = SessionLocal()
    try:
        parent = session.get(Node, parent_id)
        assert parent is not None
        row = Node(
            parent_id=parent_id,
            name=name,
            description=None,
            path="",
            node_type="note",
            location_id=location_id,
            data=data,
        )
        session.add(row)
        session.flush()
        row.path = f"{parent.path.rstrip('/')}/{row.id}"
        session.commit()
        session.refresh(row)
        return row.id
    finally:
        session.close()


def test_delete_note_only():
    location_id = _fresh_location("Delete Note Only Location")

    created = asyncio.run(
        schema.execute(
            CREATE_NODE,
            variable_values={
                "locationId": location_id,
                "nodeType": "note",
                "name": "Campaign",
                "parentId": None,
            },
            context_value=graphql_auth_context(),
        )
    )
    assert not created.errors, created.errors
    note_id = created.data["createNode"]["id"]

    deleted = asyncio.run(
        schema.execute(
            DELETE_NODE,
            variable_values={"id": note_id},
            context_value=graphql_auth_context(),
        )
    )
    assert not deleted.errors, deleted.errors
    assert deleted.data["deleteNode"] is True

    session = SessionLocal()
    try:
        assert session.get(Node, int(note_id)) is None
    finally:
        session.close()


def test_delete_child_note_row():
    location_id = _fresh_location("Delete Child Note Location")

    parent_id = _insert_root_node(location_id=location_id, name="Parent", node_type="note")

    child_id = _insert_child_note(
        location_id=location_id,
        parent_id=parent_id,
        name="Only",
        data={"note": "Keep me"},
    )

    deleted = asyncio.run(
        schema.execute(
            DELETE_NODE,
            variable_values={"id": str(child_id)},
            context_value=graphql_auth_context(),
        )
    )
    assert not deleted.errors, deleted.errors
    assert deleted.data["deleteNode"] is True

    session = SessionLocal()
    try:
        assert session.get(Node, child_id) is None
        assert session.get(Node, parent_id) is not None
    finally:
        session.close()


def test_delete_children_then_parent():
    """Generic delete does not cascade; children must be removed first."""
    location_id = _fresh_location("Delete Children Then Parent Location")

    parent_id = _insert_root_node(location_id=location_id, name="Parent", node_type="note")

    first_child_id = _insert_child_note(
        location_id=location_id,
        parent_id=parent_id,
        name="First",
        data={"order": 1},
    )
    second_child_id = _insert_child_note(
        location_id=location_id,
        parent_id=parent_id,
        name="Second",
        data={"order": 2},
    )

    for child_id in (first_child_id, second_child_id):
        deleted_child = asyncio.run(
            schema.execute(
                DELETE_NODE,
                variable_values={"id": str(child_id)},
                context_value=graphql_auth_context(),
            )
        )
        assert not deleted_child.errors, deleted_child.errors
        assert deleted_child.data["deleteNode"] is True

    deleted = asyncio.run(
        schema.execute(
            DELETE_NODE,
            variable_values={"id": str(parent_id)},
            context_value=graphql_auth_context(),
        )
    )
    assert not deleted.errors, deleted.errors
    assert deleted.data["deleteNode"] is True

    session = SessionLocal()
    try:
        assert session.get(Node, parent_id) is None
        assert session.get(Node, first_child_id) is None
        assert session.get(Node, second_child_id) is None
    finally:
        session.close()
