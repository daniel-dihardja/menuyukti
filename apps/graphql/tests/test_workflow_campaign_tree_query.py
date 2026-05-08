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
        milestoneGoal
      }
    }
  }
}
"""


def test_workflow_campaign_tree_returns_milestones_and_children():
    session = SessionLocal()
    try:
        session.query(Node).delete()
        session.query(Location).filter(Location.clerk_user_id == GRAPHQL_TEST_USER_ID).delete()
        session.commit()

        location = Location(name="Tree Query Location", clerk_user_id=GRAPHQL_TEST_USER_ID)
        session.add(location)
        session.commit()
        session.refresh(location)
        location_id = location.id
    finally:
        session.close()

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

    ms = asyncio.run(
        schema.execute(
            CREATE_NODE,
            variable_values={
                "locationId": location_id,
                "nodeType": "milestone",
                "name": "M1",
                "parentId": workflow_id,
            },
            context_value=graphql_auth_context(),
        )
    )
    assert not ms.errors, ms.errors
    milestone_id = ms.data["createNode"]["id"]

    upd = asyncio.run(
        schema.execute(
            """
mutation UpdateNode($id: ID!, $data: JSON) {
  updateNode(id: $id, data: $data) {
    id
    milestoneGoal
    data
  }
}
""",
            variable_values={
                "id": milestone_id,
                "data": {"order": 1, "goal": "Win the week"},
            },
            context_value=graphql_auth_context(),
        )
    )
    assert not upd.errors, upd.errors
    assert upd.data["updateNode"]["milestoneGoal"] == "Win the week"

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
    assert len(data["milestones"]) == 1
    m0 = data["milestones"][0]
    assert m0["milestone"]["id"] == milestone_id
    assert m0["milestone"]["milestoneGoal"] == "Win the week"


def test_workflow_campaign_tree_returns_null_for_non_workflow():
    session = SessionLocal()
    try:
        session.query(Node).delete()
        session.query(Location).filter(Location.clerk_user_id == GRAPHQL_TEST_USER_ID).delete()
        session.commit()

        location = Location(name="Tree Query Location 2", clerk_user_id=GRAPHQL_TEST_USER_ID)
        session.add(location)
        session.commit()
        session.refresh(location)
        location_id = location.id
    finally:
        session.close()

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

    ms = asyncio.run(
        schema.execute(
            CREATE_NODE,
            variable_values={
                "locationId": location_id,
                "nodeType": "milestone",
                "name": "M1",
                "parentId": workflow_id,
            },
            context_value=graphql_auth_context(),
        )
    )
    assert not ms.errors, ms.errors
    milestone_id = ms.data["createNode"]["id"]

    result = asyncio.run(
        schema.execute(
            TREE_QUERY,
            variable_values={"workflowId": milestone_id},
            context_value=graphql_auth_context(),
        )
    )
    assert not result.errors, result.errors
    assert result.data["workflowCampaignTree"] is None
