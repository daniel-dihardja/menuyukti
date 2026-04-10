"""Tests for milestone agent run persistence mutations."""

from __future__ import annotations

import asyncio
import uuid

from graphql.data_sources import Location, MilestoneAgentRun, Node, SessionLocal
from graphql.schema import schema
from graphql.tests.auth_context import GRAPHQL_TEST_USER_ID, graphql_auth_context

START_RUN = """
mutation Start($runId: String!, $milestoneId: ID!, $workflowId: ID, $traceparent: String) {
  startMilestoneAgentRun(
    runId: $runId
    milestoneId: $milestoneId
    workflowId: $workflowId
    traceparent: $traceparent
  )
}
"""

COMPLETE_RUN = """
mutation Complete(
  $runId: String!
  $status: String!
  $summary: JSON
  $externalTraceId: String
  $externalTraceUrl: String
  $timeline: JSON
  $errorMessage: String
) {
  completeMilestoneAgentRun(
    runId: $runId
    status: $status
    summary: $summary
    externalTraceId: $externalTraceId
    externalTraceUrl: $externalTraceUrl
    timeline: $timeline
    errorMessage: $errorMessage
  )
}
"""


def _workflow_and_milestone() -> tuple[int, str, str]:
    session = SessionLocal()
    try:
        session.query(MilestoneAgentRun).delete()
        session.query(Node).delete()
        session.query(Location).filter(Location.clerk_user_id == GRAPHQL_TEST_USER_ID).delete()
        session.commit()

        location = Location(name="Run trace location", clerk_user_id=GRAPHQL_TEST_USER_ID)
        session.add(location)
        session.commit()
        session.refresh(location)
        location_id = location.id
    finally:
        session.close()

    wf = asyncio.run(
        schema.execute(
            """
mutation CreateNode($locationId: Int!, $nodeType: String!, $name: String, $parentId: ID) {
  createNode(locationId: $locationId, nodeType: $nodeType, name: $name, parentId: $parentId) {
    id
  }
}
""",
            variable_values={
                "locationId": location_id,
                "nodeType": "workflow",
                "name": "W",
                "parentId": None,
            },
            context_value=graphql_auth_context(),
        )
    )
    assert not wf.errors, wf.errors
    workflow_id = wf.data["createNode"]["id"]

    ms = asyncio.run(
        schema.execute(
            """
mutation CreateNode($locationId: Int!, $nodeType: String!, $name: String, $parentId: ID) {
  createNode(locationId: $locationId, nodeType: $nodeType, name: $name, parentId: $parentId) {
    id
  }
}
""",
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
    return location_id, workflow_id, milestone_id


def test_start_milestone_agent_run_inserts_row() -> None:
    _location_id, workflow_id, milestone_id = _workflow_and_milestone()
    run_id = str(uuid.uuid4())

    result = asyncio.run(
        schema.execute(
            START_RUN,
            variable_values={
                "runId": run_id,
                "milestoneId": milestone_id,
                "workflowId": workflow_id,
                "traceparent": "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01",
            },
            context_value=graphql_auth_context(),
        )
    )
    assert not result.errors, result.errors
    assert result.data["startMilestoneAgentRun"] is True

    session = SessionLocal()
    try:
        row = session.get(MilestoneAgentRun, run_id)
        assert row is not None
        assert row.status == "running"
        assert row.milestone_node_id == int(milestone_id)
        assert row.workflow_root_id == int(workflow_id)
        assert isinstance(row.summary, dict)
        assert "traceparent" in row.summary
    finally:
        session.close()


def test_start_milestone_agent_run_idempotent() -> None:
    _location_id, workflow_id, milestone_id = _workflow_and_milestone()
    run_id = str(uuid.uuid4())
    ctx = graphql_auth_context()

    r1 = asyncio.run(
        schema.execute(
            START_RUN,
            variable_values={
                "runId": run_id,
                "milestoneId": milestone_id,
                "workflowId": workflow_id,
                "traceparent": None,
            },
            context_value=ctx,
        )
    )
    assert not r1.errors, r1.errors
    r2 = asyncio.run(
        schema.execute(
            START_RUN,
            variable_values={
                "runId": run_id,
                "milestoneId": milestone_id,
                "workflowId": workflow_id,
                "traceparent": None,
            },
            context_value=ctx,
        )
    )
    assert not r2.errors, r2.errors
    assert r2.data["startMilestoneAgentRun"] is True


def test_complete_milestone_agent_run_updates_row() -> None:
    _location_id, workflow_id, milestone_id = _workflow_and_milestone()
    run_id = str(uuid.uuid4())
    ctx = graphql_auth_context()

    asyncio.run(
        schema.execute(
            START_RUN,
            variable_values={
                "runId": run_id,
                "milestoneId": milestone_id,
                "workflowId": workflow_id,
                "traceparent": None,
            },
            context_value=ctx,
        )
    )

    done = asyncio.run(
        schema.execute(
            COMPLETE_RUN,
            variable_values={
                "runId": run_id,
                "status": "success",
                "summary": {"result_node_id": "42", "milestonedata_written": True},
                "externalTraceId": None,
                "externalTraceUrl": "https://example.com/trace",
                "timeline": [{"step": "fetch_context"}],
                "errorMessage": None,
            },
            context_value=ctx,
        )
    )
    assert not done.errors, done.errors
    assert done.data["completeMilestoneAgentRun"] is True

    session = SessionLocal()
    try:
        row = session.get(MilestoneAgentRun, run_id)
        assert row is not None
        assert row.status == "success"
        assert row.finished_at is not None
        assert isinstance(row.summary, dict)
        assert row.summary.get("result_node_id") == "42"
        assert row.external_trace_url == "https://example.com/trace"
        assert isinstance(row.timeline, list)
    finally:
        session.close()
