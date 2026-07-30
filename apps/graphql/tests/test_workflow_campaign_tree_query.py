import asyncio

from graphql.data_sources import Location, Node, SessionLocal
from graphql.schema import schema
from graphql.tests.auth_context import GRAPHQL_TEST_USER_ID, graphql_auth_context
from graphql.tests.test_nodes_query import CREATE_NODE

TREE_QUERY = """
query WorkflowCampaignTree($workflowId: ID!) {
  workflowCampaignTree(workflowId: $workflowId) {
    workflow {
      id
      nodeType
      locationId
    }
    milestones {
      milestone {
        id
        name
        nodeType
        data
      }
    }
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


def _insert_milestone(
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
            node_type="milestone",
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


def test_workflow_campaign_tree_returns_workflow_and_empty_milestones():
    location_id = _fresh_location("Tree Query Location")

    wf = asyncio.run(
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
    assert not wf.errors, wf.errors
    workflow_id = wf.data["createNode"]["id"]

    result = asyncio.run(
        schema.execute(
            TREE_QUERY,
            variable_values={"workflowId": workflow_id},
            context_value=graphql_auth_context(),
        )
    )
    assert not result.errors, result.errors
    data = result.data["workflowCampaignTree"]
    assert data is not None
    assert data["workflow"]["nodeType"] == "workflow"
    assert data["workflow"]["id"] == workflow_id
    assert data["milestones"] == []


def test_workflow_campaign_tree_returns_orm_milestones():
    location_id = _fresh_location("Tree Query ORM Location")

    wf = asyncio.run(
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
    assert not wf.errors, wf.errors
    workflow_id = wf.data["createNode"]["id"]

    milestone_id = _insert_milestone(
        location_id=location_id,
        parent_id=int(workflow_id),
        name="M1",
        data={"order": 1},
    )

    result = asyncio.run(
        schema.execute(
            TREE_QUERY,
            variable_values={"workflowId": workflow_id},
            context_value=graphql_auth_context(),
        )
    )
    assert not result.errors, result.errors
    data = result.data["workflowCampaignTree"]
    assert data is not None
    assert len(data["milestones"]) == 1
    m0 = data["milestones"][0]
    assert m0["milestone"]["id"] == str(milestone_id)
    assert m0["milestone"]["name"] == "M1"
    assert m0["milestone"]["nodeType"] == "milestone"
    assert m0["milestone"]["data"] == {"order": 1}


def test_workflow_campaign_tree_returns_null_for_non_workflow():
    location_id = _fresh_location("Tree Query Location 2")

    wf = asyncio.run(
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
    assert not wf.errors, wf.errors
    workflow_id = int(wf.data["createNode"]["id"])

    milestone_id = _insert_milestone(
        location_id=location_id,
        parent_id=workflow_id,
        name="M1",
        data={"order": 1},
    )

    result = asyncio.run(
        schema.execute(
            TREE_QUERY,
            variable_values={"workflowId": str(milestone_id)},
            context_value=graphql_auth_context(),
        )
    )
    assert not result.errors, result.errors
    assert result.data["workflowCampaignTree"] is None
