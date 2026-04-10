"""GraphQL persistence for milestone run records (ties SSE ``run_id`` to the database)."""

from __future__ import annotations

import logging
import os
from typing import Any

import httpx
from agents_app.agents.graphql_base import graphql_post

_logger = logging.getLogger(__name__)

_START_MUTATION = """
mutation StartMilestoneAgentRun(
  $runId: String!
  $milestoneId: ID!
  $workflowId: ID
  $traceparent: String
) {
  startMilestoneAgentRun(
    runId: $runId
    milestoneId: $milestoneId
    workflowId: $workflowId
    traceparent: $traceparent
  )
}
"""

_COMPLETE_MUTATION = """
mutation CompleteMilestoneAgentRun(
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


def external_trace_url_for_run(run_id: str) -> str | None:
    """Optional LangSmith (or other) URL from ``LANGSMITH_RUN_URL_TEMPLATE`` with ``{run_id}``."""
    tpl = os.environ.get("LANGSMITH_RUN_URL_TEMPLATE", "").strip()
    if not tpl:
        return None
    try:
        return tpl.format(run_id=run_id)
    except (KeyError, ValueError):
        return tpl.replace("{run_id}", run_id)


async def start_milestone_agent_run_record(
    client: httpx.AsyncClient,
    *,
    run_id: str,
    milestone_id: str,
    user_id: str,
    workflow_id: str | None,
    traceparent: str | None,
) -> bool:
    try:
        data = await graphql_post(
            client,
            _START_MUTATION,
            {
                "runId": run_id,
                "milestoneId": milestone_id,
                "workflowId": workflow_id if workflow_id else None,
                "traceparent": traceparent,
            },
            user_id,
        )
        raw = data.get("startMilestoneAgentRun")
        if raw is not True:
            _logger.warning(
                "milestone_run.persist: unexpected startMilestoneAgentRun response %s",
                raw,
            )
            return False
    except Exception:
        _logger.exception(
            "milestone_run.persist: startMilestoneAgentRun failed run_id=%s",
            run_id,
        )
        return False
    return True


async def complete_milestone_agent_run_record(
    client: httpx.AsyncClient,
    *,
    run_id: str,
    user_id: str,
    status: str,
    summary: dict[str, Any] | None = None,
    timeline: list[dict[str, Any]] | None = None,
    error_message: str | None = None,
) -> None:
    try:
        ext_url = external_trace_url_for_run(run_id)
        data = await graphql_post(
            client,
            _COMPLETE_MUTATION,
            {
                "runId": run_id,
                "status": status,
                "summary": summary,
                "externalTraceId": None,
                "externalTraceUrl": ext_url,
                "timeline": timeline,
                "errorMessage": error_message,
            },
            user_id,
        )
        raw = data.get("completeMilestoneAgentRun")
        if raw is not True:
            _logger.warning(
                "milestone_run.persist: unexpected completeMilestoneAgentRun response %s",
                raw,
            )
    except Exception:
        _logger.exception(
            "milestone_run.persist: completeMilestoneAgentRun failed run_id=%s",
            run_id,
        )
