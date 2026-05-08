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

UPDATE_NODE = """
mutation UpdateNode($id: ID!, $data: JSON!) {
  updateNode(id: $id, data: $data) { id }
}
"""


def test_delete_node_any_milestone():
    """Any milestone may be deleted, not only the last in display order."""
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
                "nodeType": "workflow",
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

    delete_first = asyncio.run(
        schema.execute(
            DELETE_NODE,
            variable_values={"id": first_id},
            context_value=graphql_auth_context(),
        )
    )
    assert not delete_first.errors, delete_first.errors
    assert delete_first.data["deleteNode"] is True

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
    assert nodes[0]["id"] == second_id
    assert nodes[0]["name"] == "Second"

    delete_second = asyncio.run(
        schema.execute(
            DELETE_NODE,
            variable_values={"id": second_id},
            context_value=graphql_auth_context(),
        )
    )
    assert not delete_second.errors, delete_second.errors
    assert delete_second.data["deleteNode"] is True

    listed_empty = asyncio.run(
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
    assert not listed_empty.errors, listed_empty.errors
    assert listed_empty.data["nodes"] == []


REPLACE_PASS_CRITERIA = """
mutation Rep($milestoneId: ID!, $locationId: Int!, $requirements: [String!]!) {
  replacePassCriteria(
    milestoneId: $milestoneId
    locationId: $locationId
    requirements: $requirements
  )
}
"""


def test_passcriteria_live_on_milestone_row_not_child_nodes():
    session = SessionLocal()
    try:
        session.query(Node).delete()
        session.query(Location).filter(Location.clerk_user_id == GRAPHQL_TEST_USER_ID).delete()
        session.commit()

        location = Location(name="Delete PC Location", clerk_user_id=GRAPHQL_TEST_USER_ID)
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
                "nodeType": "workflow",
                "name": "Campaign",
                "parentId": None,
            },
            context_value=graphql_auth_context(),
        )
    )
    assert not campaign.errors, campaign.errors
    campaign_id = campaign.data["createNode"]["id"]

    milestone = asyncio.run(
        schema.execute(
            CREATE_NODE,
            variable_values={
                "locationId": location_id,
                "nodeType": "milestone",
                "name": "M",
                "parentId": campaign_id,
            },
            context_value=graphql_auth_context(),
        )
    )
    assert not milestone.errors, milestone.errors
    milestone_id = milestone.data["createNode"]["id"]

    rep = asyncio.run(
        schema.execute(
            REPLACE_PASS_CRITERIA,
            variable_values={
                "milestoneId": milestone_id,
                "locationId": location_id,
                "requirements": ["only one"],
            },
            context_value=graphql_auth_context(),
        )
    )
    assert not rep.errors, rep.errors
    assert rep.data["replacePassCriteria"] is True

    listed = asyncio.run(
        schema.execute(
            NODES_BY_PARENT,
            variable_values={
                "locationId": location_id,
                "nodeType": None,
                "parentId": milestone_id,
            },
            context_value=graphql_auth_context(),
        )
    )
    assert not listed.errors, listed.errors
    assert listed.data["nodes"] == []

    session = SessionLocal()
    try:
        row = session.get(Node, int(milestone_id))
        assert row is not None
        assert isinstance(row.pass_criterias, list)
        assert len(row.pass_criterias) == 1
        assert row.pass_criterias[0]["requirement"] == "only one"
    finally:
        session.close()


def test_delete_milestone_removes_milestone_with_goal_in_data():
    session = SessionLocal()
    try:
        session.query(Node).delete()
        session.query(Location).filter(Location.clerk_user_id == GRAPHQL_TEST_USER_ID).delete()
        session.commit()

        location = Location(name="Delete Goal Cascade Location", clerk_user_id=GRAPHQL_TEST_USER_ID)
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
                "nodeType": "workflow",
                "name": "Campaign",
                "parentId": None,
            },
            context_value=graphql_auth_context(),
        )
    )
    assert not campaign.errors, campaign.errors
    campaign_id = campaign.data["createNode"]["id"]

    milestone = asyncio.run(
        schema.execute(
            CREATE_NODE,
            variable_values={
                "locationId": location_id,
                "nodeType": "milestone",
                "name": "Only",
                "parentId": campaign_id,
            },
            context_value=graphql_auth_context(),
        )
    )
    assert not milestone.errors, milestone.errors
    milestone_id = int(milestone.data["createNode"]["id"])

    session = SessionLocal()
    try:
        row = session.get(Node, milestone_id)
        assert row is not None
        row.milestone_goal = "Keep me"
        session.commit()
    finally:
        session.close()

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
    finally:
        session.close()


def test_delete_milestone_clears_row_and_has_no_legacy_children():
    session = SessionLocal()
    try:
        session.query(Node).delete()
        session.query(Location).filter(Location.clerk_user_id == GRAPHQL_TEST_USER_ID).delete()
        session.commit()

        location = Location(
            name="Delete MilestoneData Cascade Location", clerk_user_id=GRAPHQL_TEST_USER_ID
        )
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
                "nodeType": "workflow",
                "name": "Campaign",
                "parentId": None,
            },
            context_value=graphql_auth_context(),
        )
    )
    assert not campaign.errors, campaign.errors
    campaign_id = campaign.data["createNode"]["id"]

    milestone = asyncio.run(
        schema.execute(
            CREATE_NODE,
            variable_values={
                "locationId": location_id,
                "nodeType": "milestone",
                "name": "Only",
                "parentId": campaign_id,
            },
            context_value=graphql_auth_context(),
        )
    )
    assert not milestone.errors, milestone.errors
    milestone_id = milestone.data["createNode"]["id"]

    md = asyncio.run(
        schema.execute(
            UPDATE_NODE,
            variable_values={
                "id": milestone_id,
                "data": {"milestonePresetData": {"note": "Keep me"}},
            },
            context_value=graphql_auth_context(),
        )
    )
    assert not md.errors, md.errors

    deleted = asyncio.run(
        schema.execute(
            DELETE_NODE,
            variable_values={"id": milestone_id},
            context_value=graphql_auth_context(),
        )
    )
    assert not deleted.errors, deleted.errors
    assert deleted.data["deleteNode"] is True

    session = SessionLocal()
    try:
        assert session.get(Node, int(milestone_id)) is None
    finally:
        session.close()


def test_delete_workflow_cascades_milestones_and_children():
    session = SessionLocal()
    try:
        session.query(Node).delete()
        session.query(Location).filter(Location.clerk_user_id == GRAPHQL_TEST_USER_ID).delete()
        session.commit()

        location = Location(
            name="Delete Workflow Cascade Location", clerk_user_id=GRAPHQL_TEST_USER_ID
        )
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
                "nodeType": "workflow",
                "name": "Campaign",
                "parentId": None,
            },
            context_value=graphql_auth_context(),
        )
    )
    assert not campaign.errors, campaign.errors
    campaign_id = campaign.data["createNode"]["id"]

    first_ms = asyncio.run(
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
    assert not first_ms.errors, first_ms.errors
    first_milestone_id = first_ms.data["createNode"]["id"]

    second_ms = asyncio.run(
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
    assert not second_ms.errors, second_ms.errors
    second_milestone_id = second_ms.data["createNode"]["id"]

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
        wf_pk = int(campaign_id)
        assert session.get(Node, wf_pk) is None
        assert session.get(Node, int(first_milestone_id)) is None
        assert session.get(Node, int(second_milestone_id)) is None
        remaining = (
            session.query(Node)
            .filter(Node.location_id == location_id, Node.parent_id == wf_pk)
            .count()
        )
        assert remaining == 0
    finally:
        session.close()
