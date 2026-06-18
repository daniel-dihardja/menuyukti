"""Mutations to record milestone agent runs (called from apps/agents over GraphQL)."""

from __future__ import annotations

import strawberry
from strawberry.scalars import JSON

from graphql.context import request_session_scope
from graphql.data_sources import MilestoneAgentRun, Node
from graphql.schema.auth import require_location_owner, user_id_from_info


def _parse_positive_int(raw: strawberry.ID, field: str) -> int:
    try:
        pk = int(str(raw))
    except ValueError as e:
        msg = f"Invalid {field}"
        raise ValueError(msg) from e
    if pk < 1:
        msg = f"Invalid {field}"
        raise ValueError(msg)
    return pk


@strawberry.type
class MilestoneAgentRunMutation:
    @strawberry.mutation
    def start_milestone_agent_run(
        self,
        info: strawberry.Info,
        run_id: str,
        milestone_id: strawberry.ID,
        workflow_id: strawberry.ID | None = None,
        traceparent: str | None = None,
    ) -> bool:
        """Insert a ``running`` row; idempotent if the same ``run_id`` already exists."""
        user_id = user_id_from_info(info)
        if not user_id:
            raise ValueError("Missing authenticated user for startMilestoneAgentRun")

        rid = run_id.strip()
        if not rid:
            raise ValueError("run_id cannot be empty")

        milestone_pk = _parse_positive_int(milestone_id, "milestone id")
        workflow_pk: int | None = None
        if workflow_id is not None and str(workflow_id).strip():
            workflow_pk = _parse_positive_int(workflow_id, "workflow id")

        with request_session_scope(info) as session:
            existing = session.get(MilestoneAgentRun, rid)
            if existing is not None:
                return True

            milestone = session.get(Node, milestone_pk)
            if milestone is None:
                raise ValueError("Milestone node not found")
            if milestone.node_type != "milestone":
                raise ValueError("Node is not a milestone")
            if milestone.location_id is None:
                raise ValueError("Milestone has no location")

            require_location_owner(session, milestone.location_id, user_id)

            if workflow_pk is not None:
                wf = session.get(Node, workflow_pk)
                if wf is None:
                    raise ValueError("Workflow node not found")
                if wf.location_id != milestone.location_id:
                    raise ValueError("Workflow location does not match milestone")

            summary: dict[str, str] | None = None
            if traceparent and traceparent.strip():
                summary = {"traceparent": traceparent.strip()}

            session.add(
                MilestoneAgentRun(
                    run_id=rid,
                    milestone_node_id=milestone_pk,
                    workflow_root_id=workflow_pk,
                    location_id=milestone.location_id,
                    user_id=user_id,
                    status="running",
                    summary=summary,
                ),
            )
            session.commit()
        return True

    @strawberry.mutation
    def complete_milestone_agent_run(
        self,
        info: strawberry.Info,
        run_id: str,
        status: str,
        summary: JSON | None = None,
        external_trace_id: str | None = None,
        external_trace_url: str | None = None,
        timeline: JSON | None = None,
        error_message: str | None = None,
    ) -> bool:
        """Mark a run finished (``success`` or ``error``)."""
        user_id = user_id_from_info(info)
        if not user_id:
            raise ValueError("Missing authenticated user for completeMilestoneAgentRun")

        rid = run_id.strip()
        if not rid:
            raise ValueError("run_id cannot be empty")

        st = status.strip().lower()
        if st not in ("success", "error"):
            raise ValueError("status must be success or error")

        from datetime import UTC, datetime

        with request_session_scope(info) as session:
            row = session.get(MilestoneAgentRun, rid)
            if row is None:
                raise ValueError("Milestone agent run not found")
            if row.user_id != user_id:
                raise ValueError("Milestone agent run not found")

            require_location_owner(session, row.location_id, user_id)

            merged: dict = {}
            if isinstance(row.summary, dict):
                merged.update(row.summary)
            if isinstance(summary, dict):
                merged.update(summary)

            row.status = st
            row.finished_at = datetime.now(UTC)
            row.summary = merged or None
            row.timeline = timeline
            row.external_trace_id = (
                external_trace_id.strip()
                if external_trace_id and external_trace_id.strip()
                else None
            )
            row.external_trace_url = (
                external_trace_url.strip()
                if external_trace_url and external_trace_url.strip()
                else None
            )
            row.error_message = (
                error_message.strip() if error_message and error_message.strip() else None
            )
            session.commit()
        return True
