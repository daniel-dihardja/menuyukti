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


def test_nodes_filters_by_parent_id():
    location_id = _fresh_location("Nodes Query Location")

    root = asyncio.run(
        schema.execute(
            CREATE_NODE,
            variable_values={
                "locationId": location_id,
                "nodeType": "note",
                "name": "Test Root",
                "parentId": None,
            },
            context_value=graphql_auth_context(),
        )
    )
    assert not root.errors, root.errors
    root_id = root.data["createNode"]["id"]

    root2 = asyncio.run(
        schema.execute(
            CREATE_NODE,
            variable_values={
                "locationId": location_id,
                "nodeType": "note",
                "name": "Other Root",
                "parentId": None,
            },
            context_value=graphql_auth_context(),
        )
    )
    assert not root2.errors, root2.errors

    result = asyncio.run(
        schema.execute(
            NODES_BY_PARENT,
            variable_values={
                "locationId": location_id,
                "nodeType": "note",
                "parentId": None,
            },
            context_value=graphql_auth_context(),
        )
    )
    assert not result.errors, result.errors
    nodes = result.data["nodes"]
    assert len(nodes) == 2
    assert {n["id"] for n in nodes} == {
        root_id,
        root2.data["createNode"]["id"],
    }
    assert all(n["parentId"] is None for n in nodes)

    # Legacy milestone children inserted via ORM still filter by parent.
    session = SessionLocal()
    try:
        parent = session.get(Node, int(root_id))
        assert parent is not None
        child = Node(
            parent_id=int(root_id),
            name="Step one",
            description=None,
            path="",
            node_type="milestone",
            location_id=location_id,
            data={"order": 1},
        )
        session.add(child)
        session.flush()
        child.path = f"{parent.path.rstrip('/')}/{child.id}"
        session.commit()
        session.refresh(child)
        child_id = str(child.id)
    finally:
        session.close()

    listed = asyncio.run(
        schema.execute(
            NODES_BY_PARENT,
            variable_values={
                "locationId": location_id,
                "nodeType": "milestone",
                "parentId": root_id,
            },
            context_value=graphql_auth_context(),
        )
    )
    assert not listed.errors, listed.errors
    nodes = listed.data["nodes"]
    assert len(nodes) == 1
    assert nodes[0]["id"] == child_id
    assert nodes[0]["name"] == "Step one"
    assert nodes[0]["parentId"] == root_id


def test_nodes_respects_first_and_after_cursor():
    location_id = _fresh_location("Cursor Location")

    async def _create_note(name: str) -> str:
        r = await schema.execute(
            CREATE_NODE,
            variable_values={
                "locationId": location_id,
                "nodeType": "note",
                "name": name,
                "parentId": None,
            },
            context_value=graphql_auth_context(),
        )
        assert not r.errors, r.errors
        return r.data["createNode"]["id"]

    n1 = asyncio.run(_create_note("N1"))
    n2 = asyncio.run(_create_note("N2"))

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
    assert ids == {n1, n2}
