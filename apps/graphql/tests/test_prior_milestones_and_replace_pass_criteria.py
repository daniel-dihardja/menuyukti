"""Tests for priorMilestonesMilestoneData query and replacePassCriteria mutation."""

from __future__ import annotations

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
  $data: JSON
) {
  createNode(
    locationId: $locationId
    nodeType: $nodeType
    name: $name
    parentId: $parentId
    data: $data
  ) {
    id
    name
    nodeType
  }
}
"""

UPDATE_NODE = """
mutation U($id: ID!, $data: JSON!) {
  updateNode(id: $id, data: $data) {
    id
    milestonePresetData
  }
}
"""

PRIOR_DATA = """
query Prior($workflowId: ID!, $milestoneId: ID!, $locationId: Int!) {
  priorMilestonesMilestoneData(
    workflowId: $workflowId
    milestoneId: $milestoneId
    locationId: $locationId
  )
}
"""

NODES = """
query N($locationId: Int!, $parentId: ID!) {
  nodes(locationId: $locationId, parentId: $parentId, first: 50) {
    id
    nodeType
    data
  }
}
"""

REPLACE_PC = """
mutation Replace($milestoneId: ID!, $locationId: Int!, $requirements: [String!]!) {
  replacePassCriteria(
    milestoneId: $milestoneId
    locationId: $locationId
    requirements: $requirements
  )
}
"""


def test_prior_milestones_milestone_data_includes_earlier_milestonedata():
    session = SessionLocal()
    try:
        session.query(Node).delete()
        session.query(Location).filter(Location.clerk_user_id == GRAPHQL_TEST_USER_ID).delete()
        session.commit()

        location = Location(name="Prior MD Location", clerk_user_id=GRAPHQL_TEST_USER_ID)
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
                "name": "WF",
                "parentId": None,
            },
            context_value=graphql_auth_context(),
        )
    )
    assert not wf.errors, wf.errors
    workflow_id = wf.data["createNode"]["id"]

    m1 = asyncio.run(
        schema.execute(
            CREATE_NODE,
            variable_values={
                "locationId": location_id,
                "nodeType": "milestone",
                "name": "Earlier",
                "parentId": workflow_id,
            },
            context_value=graphql_auth_context(),
        )
    )
    assert not m1.errors, m1.errors
    m1_id = m1.data["createNode"]["id"]

    asyncio.run(
        schema.execute(
            UPDATE_NODE,
            variable_values={
                "id": m1_id,
                "data": {"milestonePresetData": {"body": "# Body from earlier"}},
            },
            context_value=graphql_auth_context(),
        )
    )

    m2 = asyncio.run(
        schema.execute(
            CREATE_NODE,
            variable_values={
                "locationId": location_id,
                "nodeType": "milestone",
                "name": "Current",
                "parentId": workflow_id,
            },
            context_value=graphql_auth_context(),
        )
    )
    assert not m2.errors, m2.errors
    m2_id = m2.data["createNode"]["id"]

    out = asyncio.run(
        schema.execute(
            PRIOR_DATA,
            variable_values={
                "workflowId": workflow_id,
                "milestoneId": m2_id,
                "locationId": location_id,
            },
            context_value=graphql_auth_context(),
        )
    )
    assert not out.errors, out.errors
    rows = out.data["priorMilestonesMilestoneData"]
    assert isinstance(rows, list) and len(rows) == 1
    assert rows[0]["title"] == "Earlier"
    assert rows[0].get("presetId") is None
    assert rows[0]["data"] == {"body": "# Body from earlier"}
    assert str(rows[0].get("id") or "").strip() != ""
    assert rows[0]["id"] == m1_id


def test_prior_milestones_milestone_data_includes_preset_id_from_milestone_node():
    session = SessionLocal()
    try:
        session.query(Node).delete()
        session.query(Location).filter(Location.clerk_user_id == GRAPHQL_TEST_USER_ID).delete()
        session.commit()

        location = Location(name="Prior MD PresetId", clerk_user_id=GRAPHQL_TEST_USER_ID)
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
                "name": "WF",
                "parentId": None,
            },
            context_value=graphql_auth_context(),
        )
    )
    assert not wf.errors, wf.errors
    workflow_id = wf.data["createNode"]["id"]

    m1 = asyncio.run(
        schema.execute(
            CREATE_NODE,
            variable_values={
                "locationId": location_id,
                "nodeType": "milestone",
                "name": "campaign_brief step",
                "parentId": workflow_id,
                "data": {"presetId": "restaurant_campaign_brief"},
            },
            context_value=graphql_auth_context(),
        )
    )
    assert not m1.errors, m1.errors
    m1_id = m1.data["createNode"]["id"]

    asyncio.run(
        schema.execute(
            UPDATE_NODE,
            variable_values={
                "id": m1_id,
                "data": {
                    "milestonePresetData": {
                        "venueSnapshot": {
                            "venueName": "X",
                            "city": "Y",
                            "country": "Z",
                            "currency": "EUR",
                        }
                    }
                },
            },
            context_value=graphql_auth_context(),
        )
    )

    m2 = asyncio.run(
        schema.execute(
            CREATE_NODE,
            variable_values={
                "locationId": location_id,
                "nodeType": "milestone",
                "name": "Later",
                "parentId": workflow_id,
            },
            context_value=graphql_auth_context(),
        )
    )
    assert not m2.errors, m2.errors
    m2_id = m2.data["createNode"]["id"]

    out = asyncio.run(
        schema.execute(
            PRIOR_DATA,
            variable_values={
                "workflowId": workflow_id,
                "milestoneId": m2_id,
                "locationId": location_id,
            },
            context_value=graphql_auth_context(),
        )
    )
    assert not out.errors, out.errors
    rows = out.data["priorMilestonesMilestoneData"]
    assert isinstance(rows, list) and len(rows) == 1
    assert rows[0]["title"] == "campaign_brief step"
    assert rows[0]["presetId"] == "restaurant_campaign_brief"
    assert rows[0]["id"] == m1_id
    assert rows[0]["data"] == {
        "venueSnapshot": {"venueName": "X", "city": "Y", "country": "Z", "currency": "EUR"}
    }


def test_prior_milestones_milestone_data_empty_when_first_milestone():
    """First milestone in order has no prior rows — resolver returns []."""
    session = SessionLocal()
    try:
        session.query(Node).delete()
        session.query(Location).filter(Location.clerk_user_id == GRAPHQL_TEST_USER_ID).delete()
        session.commit()

        location = Location(name="Prior MD First Only", clerk_user_id=GRAPHQL_TEST_USER_ID)
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
                "name": "WF",
                "parentId": None,
            },
            context_value=graphql_auth_context(),
        )
    )
    assert not wf.errors, wf.errors
    workflow_id = wf.data["createNode"]["id"]

    m1 = asyncio.run(
        schema.execute(
            CREATE_NODE,
            variable_values={
                "locationId": location_id,
                "nodeType": "milestone",
                "name": "Only",
                "parentId": workflow_id,
            },
            context_value=graphql_auth_context(),
        )
    )
    assert not m1.errors, m1.errors
    m1_id = m1.data["createNode"]["id"]

    out = asyncio.run(
        schema.execute(
            PRIOR_DATA,
            variable_values={
                "workflowId": workflow_id,
                "milestoneId": m1_id,
                "locationId": location_id,
            },
            context_value=graphql_auth_context(),
        )
    )
    assert not out.errors, out.errors
    assert out.data["priorMilestonesMilestoneData"] == []


def test_replace_pass_criteria_writes_pass_criterias_column():
    session = SessionLocal()
    try:
        session.query(Node).delete()
        session.query(Location).filter(Location.clerk_user_id == GRAPHQL_TEST_USER_ID).delete()
        session.commit()

        location = Location(name="Replace PC Location", clerk_user_id=GRAPHQL_TEST_USER_ID)
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
                "name": "WF",
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
                "name": "M",
                "parentId": workflow_id,
            },
            context_value=graphql_auth_context(),
        )
    )
    assert not ms.errors, ms.errors
    milestone_id = ms.data["createNode"]["id"]

    rep = asyncio.run(
        schema.execute(
            REPLACE_PC,
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

    nodes = asyncio.run(
        schema.execute(
            NODES,
            variable_values={"locationId": location_id, "parentId": milestone_id},
            context_value=graphql_auth_context(),
        )
    )
    assert not nodes.errors, nodes.errors
    assert nodes.data["nodes"] == []

    session = SessionLocal()
    try:
        row = session.get(Node, int(milestone_id))
        assert row is not None
        assert isinstance(row.pass_criterias, list)
        assert len(row.pass_criterias) == 1
        assert row.pass_criterias[0]["requirement"] == "only one"
        assert row.pass_criterias[0]["status"] == "open"
    finally:
        session.close()
