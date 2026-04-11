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
            CREATE_NODE,
            variable_values={
                "locationId": location_id,
                "nodeType": "milestonedata",
                "name": "Data",
                "parentId": m1_id,
                "data": {"data": "# Body from earlier"},
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
    text = out.data["priorMilestonesMilestoneData"]
    assert "## Earlier" in text
    assert "# Body from earlier" in text


def test_replace_pass_criteria_replaces_children():
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

    for label in ("A", "B"):
        asyncio.run(
            schema.execute(
                CREATE_NODE,
                variable_values={
                    "locationId": location_id,
                    "nodeType": "passcriteria",
                    "name": f"PC {label}",
                    "parentId": milestone_id,
                    "data": {"requirement": label, "status": "open"},
                },
                context_value=graphql_auth_context(),
            )
        )

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
    pcs = [
        n
        for n in nodes.data["nodes"]
        if n.get("nodeType") == "passcriteria"
    ]
    assert len(pcs) == 1
    assert pcs[0]["data"]["requirement"] == "only one"
    assert pcs[0]["data"]["status"] == "open"
