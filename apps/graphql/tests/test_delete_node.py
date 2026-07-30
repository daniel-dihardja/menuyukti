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


def test_delete_workflow_only():
    location_id = _fresh_location("Delete Workflow Only Location")

    campaign = asyncio.run(
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
    assert not campaign.errors, campaign.errors
    campaign_id = campaign.data["createNode"]["id"]

    deleted = asyncio.run(
        schema.execute(
            DELETE_NODE,
            variable_values={"id": campaign_id},
            context_value=graphql_auth_context(),
        )
    )
    assert not deleted.errors, deleted.errors
    assert deleted.data["deleteNode"] is True

    session = SessionLocal()
    try:
        assert session.get(Node, int(campaign_id)) is None
    finally:
        session.close()


def test_delete_orm_milestone_row():
    location_id = _fresh_location("Delete ORM Milestone Location")

    campaign = asyncio.run(
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
    assert not campaign.errors, campaign.errors
    campaign_id = int(campaign.data["createNode"]["id"])

    milestone_id = _insert_milestone(
        location_id=location_id,
        parent_id=campaign_id,
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
        assert session.get(Node, campaign_id) is not None
    finally:
        session.close()


def test_delete_workflow_cascades_milestones_and_children():
    location_id = _fresh_location("Delete Workflow Cascade Location")

    campaign = asyncio.run(
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
    assert not campaign.errors, campaign.errors
    campaign_id = int(campaign.data["createNode"]["id"])

    first_milestone_id = _insert_milestone(
        location_id=location_id,
        parent_id=campaign_id,
        name="First",
        data={"order": 1},
    )
    second_milestone_id = _insert_milestone(
        location_id=location_id,
        parent_id=campaign_id,
        name="Second",
        data={"order": 2},
    )

    deleted = asyncio.run(
        schema.execute(
            DELETE_NODE,
            variable_values={"id": str(campaign_id)},
            context_value=graphql_auth_context(),
        )
    )
    assert not deleted.errors, deleted.errors
    assert deleted.data["deleteNode"] is True

    session = SessionLocal()
    try:
        assert session.get(Node, campaign_id) is None
        assert session.get(Node, first_milestone_id) is None
        assert session.get(Node, second_milestone_id) is None
        remaining = (
            session.query(Node)
            .filter(Node.location_id == location_id, Node.parent_id == campaign_id)
            .count()
        )
        assert remaining == 0
    finally:
        session.close()
