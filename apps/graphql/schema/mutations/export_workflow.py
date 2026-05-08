"""Persist a JSON snapshot of a workflow root's milestones and child nodes."""

from __future__ import annotations

from datetime import UTC, datetime

import strawberry
from sqlalchemy.orm import Session

from graphql.data_sources import Node, SessionLocal, WorkflowExport
from graphql.schema.auth import require_location_owner, user_id_from_info
from graphql.schema.node_handlers.milestone import _milestone_sort_key
from graphql.schema.types import WorkflowExportType

SCHEMA_VERSION = "3.0"


def _milestone_order(data: object | None) -> int:
    if not isinstance(data, dict):
        return 0
    raw = data.get("order")
    return raw if isinstance(raw, int) else 0


def _derive_rail_status(
    pass_rows: list[dict[str, object]],
    result_summary: str | None,
) -> str:
    if not pass_rows:
        return "complete" if (result_summary or "").strip() else "empty"
    if any(r.get("status") == "fail" for r in pass_rows):
        return "failed"
    if all(r.get("status") == "pass" for r in pass_rows):
        return "complete"
    return "pending"


def _serialize_milestone(milestone: Node) -> dict[str, object]:
    m_data = milestone.data if isinstance(milestone.data, dict) else {}

    goal_text: str | None = None
    mg = milestone.milestone_goal
    if isinstance(mg, str) and mg.strip():
        goal_text = mg.strip()
    else:
        raw_goal = m_data.get("goal")
        goal_text = raw_goal.strip() if isinstance(raw_goal, str) and raw_goal.strip() else None

    milestone_data = milestone.milestone_preset_data
    if milestone_data is None:
        milestone_data = None
    elif isinstance(milestone_data, (dict, list)):
        pass
    else:
        milestone_data = None

    pass_criteria: list[dict[str, object]] = []
    raw_pc = milestone.pass_criterias
    if isinstance(raw_pc, list):
        for item in raw_pc:
            if not isinstance(item, dict):
                continue
            cid = item.get("id")
            req = item.get("requirement")
            st = item.get("status")
            if not isinstance(req, str):
                continue
            if st not in ("pass", "fail", "open"):
                continue
            row: dict[str, object] = {
                "requirement": req,
                "status": st,
                "id": str(cid) if cid is not None else "",
            }
            pass_criteria.append(row)

    result_obj: dict[str, object] | None = None
    result_summary: str | None = None
    mr = milestone.milestone_result
    if isinstance(mr, dict):
        summary = mr.get("summary")
        passed = mr.get("passed")
        total = mr.get("total")
        if isinstance(summary, str) and isinstance(passed, int) and isinstance(total, int):
            result_obj = {
                "summary": summary,
                "passed": passed,
                "total": total,
            }
            crit = mr.get("criteria")
            if crit is not None:
                result_obj["criteria"] = crit
            result_summary = summary

    status = _derive_rail_status(pass_criteria, result_summary)

    out_m: dict[str, object] = {
        "id": str(milestone.id),
        "title": milestone.name,
        "order": _milestone_order(milestone.data),
        "passCriteria": pass_criteria,
        "status": status,
    }
    raw_pid = m_data.get("presetId")
    if isinstance(raw_pid, str) and raw_pid.strip():
        out_m["presetId"] = raw_pid.strip()
    if goal_text is not None:
        out_m["goal"] = goal_text
    if milestone_data is not None:
        out_m["data"] = milestone_data
    if result_obj is not None:
        out_m["result"] = result_obj
    else:
        out_m["result"] = None

    return out_m


def _build_payload(session: Session, root: Node) -> dict[str, object]:
    milestones_raw = (
        session.query(Node)
        .filter(
            Node.parent_id == root.id,
            Node.location_id == root.location_id,
            Node.node_type == "milestone",
        )
        .all()
    )
    milestones_raw.sort(key=_milestone_sort_key)

    milestones = [_serialize_milestone(m) for m in milestones_raw]

    exported_at = datetime.now(UTC).isoformat().replace("+00:00", "Z")

    payload: dict[str, object] = {
        "schemaVersion": SCHEMA_VERSION,
        "workflowId": str(root.id),
        "workflowName": root.name,
        "exportedAt": exported_at,
        "milestones": milestones,
    }

    return payload


def _export_to_gql(row: WorkflowExport) -> WorkflowExportType:
    return WorkflowExportType(
        id=str(row.id),
        workflow_id=str(row.workflow_id),
        location_id=row.location_id,
        payload=row.payload,
        schema_version=row.schema_version,
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


@strawberry.type
class ExportWorkflowMutation:
    @strawberry.mutation
    def export_workflow(
        self,
        info: strawberry.Info,
        workflow_id: strawberry.ID,
        location_id: int,
    ) -> WorkflowExportType:
        user_id = user_id_from_info(info)
        if not user_id:
            raise ValueError("Missing authenticated user for exportWorkflow")

        try:
            root_pk = int(str(workflow_id))
        except ValueError as e:
            raise ValueError("Invalid workflow id") from e
        if root_pk < 1:
            raise ValueError("Invalid workflow id")

        with SessionLocal() as session:
            require_location_owner(session, location_id, user_id)

            root = session.get(Node, root_pk)
            if root is None:
                raise ValueError("Workflow root not found")
            if root.node_type != "workflow":
                raise ValueError("Node is not a workflow root")
            if root.location_id != location_id:
                raise ValueError("Workflow root does not belong to this location")

            payload = _build_payload(session, root)

            existing = (
                session.query(WorkflowExport)
                .filter(WorkflowExport.workflow_id == root_pk)
                .one_or_none()
            )
            if existing is not None:
                existing.payload = payload
                existing.schema_version = SCHEMA_VERSION
                existing.location_id = location_id
                session.commit()
                session.refresh(existing)
                return _export_to_gql(existing)

            row = WorkflowExport(
                workflow_id=root_pk,
                location_id=location_id,
                payload=payload,
                schema_version=SCHEMA_VERSION,
            )
            session.add(row)
            session.commit()
            session.refresh(row)
            return _export_to_gql(row)
