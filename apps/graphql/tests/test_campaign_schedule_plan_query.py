"""Integration tests for campaignSchedulePlan GraphQL field."""

import asyncio
from datetime import datetime

from graphql.data_sources import AnalyticsRun, Node, SessionLocal
from graphql.schema import schema
from graphql.tests.auth_context import graphql_auth_context

CREATE_NODE_WITH_DATA = """
mutation CreateNodeWithData(
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
    nodeType
    parentId
    locationId
  }
}
"""

CAMPAIGN_SCHEDULE_PLAN_QUERY = """
query CampaignSchedulePlan($workflowId: ID!, $milestoneId: ID!, $locationId: Int!, $runId: ID) {
  campaignSchedulePlan(
    workflowId: $workflowId
    milestoneId: $milestoneId
    locationId: $locationId
    analyticsRunId: $runId
  ) {
    analyticsRunId
    campaignStart
    campaignEnd
    timezone
    postsPerWeek
    sourceSignalsSummary
    slots {
      dateTime
      postType
      promotedMenuItems
      visualIdea
      captionIdea
    }
  }
}
"""


def test_campaign_schedule_plan_returns_slots(analytics_run_with_qa_data):
    run_id = analytics_run_with_qa_data
    session = SessionLocal()
    try:
        run = session.get(AnalyticsRun, run_id)
        assert run is not None
        location_id = run.location_id
        session.query(Node).filter(Node.location_id == location_id).delete()
        session.commit()
    finally:
        session.close()

    workflow = asyncio.run(
        schema.execute(
            CREATE_NODE_WITH_DATA,
            variable_values={
                "locationId": location_id,
                "nodeType": "workflow",
                "name": "Campaign Workflow",
                "parentId": None,
                "data": {},
            },
            context_value=graphql_auth_context(),
        )
    )
    assert not workflow.errors, workflow.errors
    workflow_id = workflow.data["createNode"]["id"]

    dates_milestone = asyncio.run(
        schema.execute(
            CREATE_NODE_WITH_DATA,
            variable_values={
                "locationId": location_id,
                "nodeType": "milestone",
                "name": "Dates",
                "parentId": workflow_id,
                "data": {"order": 1, "presetId": "dates"},
            },
            context_value=graphql_auth_context(),
        )
    )
    assert not dates_milestone.errors, dates_milestone.errors
    dates_milestone_id = dates_milestone.data["createNode"]["id"]

    dates_data = asyncio.run(
        schema.execute(
            CREATE_NODE_WITH_DATA,
            variable_values={
                "locationId": location_id,
                "nodeType": "milestonedata",
                "name": "Data",
                "parentId": dates_milestone_id,
                "data": {
                    "startDate": "2026-06-01",
                    "endDate": "2026-06-30",
                    "publicHolidays": [],
                },
            },
            context_value=graphql_auth_context(),
        )
    )
    assert not dates_data.errors, dates_data.errors

    scheduler_milestone = asyncio.run(
        schema.execute(
            CREATE_NODE_WITH_DATA,
            variable_values={
                "locationId": location_id,
                "nodeType": "milestone",
                "name": "Scheduler",
                "parentId": workflow_id,
                "data": {"order": 2, "presetId": "scheduler"},
            },
            context_value=graphql_auth_context(),
        )
    )
    assert not scheduler_milestone.errors, scheduler_milestone.errors
    scheduler_milestone_id = scheduler_milestone.data["createNode"]["id"]

    result = asyncio.run(
        schema.execute(
            CAMPAIGN_SCHEDULE_PLAN_QUERY,
            variable_values={
                "workflowId": workflow_id,
                "milestoneId": scheduler_milestone_id,
                "locationId": location_id,
                "runId": str(run_id),
            },
            context_value=graphql_auth_context(),
        )
    )
    assert not result.errors, result.errors
    payload = result.data["campaignSchedulePlan"]
    assert payload is not None
    assert payload["campaignStart"] == "2026-06-01"
    assert payload["campaignEnd"] == "2026-06-30"
    assert payload["postsPerWeek"] >= 1
    assert len(payload["slots"]) >= 1
    first = payload["slots"][0]
    assert first["postType"] in {"single", "carousel"}
    assert len(first["promotedMenuItems"]) >= 1
    for slot in payload["slots"]:
        weekday = datetime.fromisoformat(slot["dateTime"]).weekday()
        # QA fixture for operating-profile tests uses only Monday and Friday traffic.
        assert weekday in {0, 4}
