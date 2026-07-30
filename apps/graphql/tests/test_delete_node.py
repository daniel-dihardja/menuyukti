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


def _insert_milestone(
    *,
    location_id: int,
    parent_id: int,
    name: str,
    data: dict | None = None,
    milestone_goal: str | None = None,
    milestone_preset_data: dict | None = None,
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
            node_type="milestone",
            location_id=location_id,
            data=data,
            milestone_goal=milestone_goal,
            milestone_preset_data=milestone_preset_data,
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


def test_delete_orm_milestone_row():
    location_id = _fresh_location("Delete ORM Milestone Location")

    parent_id = _insert_root_node(location_id=location_id, name="Campaign", node_type="workflow")

    milestone_id = _insert_milestone(
        location_id=location_id,
        parent_id=parent_id,
        name="Only",
        milestone_goal="Keep me",
        milestone_preset_data={"note": "Keep me"},
    )

    deleted = asyncio.run(
        schema.execute(
            DELETE_NODE,
            variable_values={"id": str(milestone_id)},
            context_value=graphql_auth_context(),
        )
    )
    assert not deleted.errors, deleted.errors
    assert deleted.data["deleteNode"] is True

    session = SessionLocal()
    try:
        assert session.get(Node, milestone_id) is None
        assert session.get(Node, parent_id) is not None
    finally:
        session.close()


def test_delete_children_then_parent():
    """Generic delete does not cascade; children must be removed first."""
    location_id = _fresh_location("Delete Children Then Parent Location")

    parent_id = _insert_root_node(location_id=location_id, name="Campaign", node_type="workflow")

    first_milestone_id = _insert_milestone(
        location_id=location_id,
        parent_id=parent_id,
        name="First",
        data={"order": 1},
    )
    second_milestone_id = _insert_milestone(
        location_id=location_id,
        parent_id=parent_id,
        name="Second",
        data={"order": 2},
    )

    for child_id in (first_milestone_id, second_milestone_id):
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
        assert session.get(Node, first_milestone_id) is None
        assert session.get(Node, second_milestone_id) is None
    finally:
        session.close()
