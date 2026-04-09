"""Persist a JSON snapshot of a workflow root's milestones and child nodes."""

from __future__ import annotations

from datetime import UTC, datetime

import strawberry
from sqlalchemy.orm import Session

from graphql.data_sources import Node, SessionLocal, WorkflowExport
from graphql.schema.auth import require_location_owner, user_id_from_info
from graphql.schema.node_handlers.milestone import _milestone_sort_key
from graphql.schema.types import WorkflowExportType

SCHEMA_VERSION = "2.0"


def _workflow_goal_from_data(data: object | None) -> str | None:
    if not isinstance(data, dict):
        return None
    g = data.get("goal")
    return g if isinstance(g, str) else None


def _milestone_order(data: object | None) -> int:
    if not isinstance(data, dict):
        return 0
    raw = data.get("order")
    return raw if isinstance(raw, int) else 0


def _milestone_data_task(data: object | None) -> str:
    if not isinstance(data, dict):
        return "manual"
    dt = data.get("dataTask")
    if dt == "location_profile":
        return "location_profile"
    if dt == "instagram_campaign_schedule":
        return "instagram_campaign_schedule"
    if dt == "restaurant_brand_brief":
        return "restaurant_brand_brief"
    if dt == "social_campaign_calendar":
        return "social_campaign_calendar"
    if dt == "social_caption_batch":
        return "social_caption_batch"
    if dt == "visual_creative_brief":
        return "visual_creative_brief"
    return "manual"


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


def _serialize_milestone(children: list[Node], milestone: Node) -> dict[str, object]:
    goal_nodes = [c for c in children if c.node_type == "goal"]
    pass_nodes = [c for c in children if c.node_type == "passcriteria"]
    md_nodes = [c for c in children if c.node_type == "milestonedata"]
    result_nodes = [c for c in children if c.node_type == "result"]

    m_data = milestone.data if isinstance(milestone.data, dict) else {}
    legacy_goal = m_data.get("goal") if isinstance(m_data.get("goal"), str) else None

    goal_text: str | None = legacy_goal
    for gn in goal_nodes:
        gd = gn.data if isinstance(gn.data, dict) else {}
        gval = gd.get("goal")
        if isinstance(gval, str):
            goal_text = gval
            break

    milestone_data: str | None = None
    for mn in md_nodes:
        md = mn.data if isinstance(mn.data, dict) else {}
        dval = md.get("data")
        if isinstance(dval, str):
            milestone_data = dval
            break

    pass_criteria: list[dict[str, object]] = []
    for pn in pass_nodes:
        pd = pn.data if isinstance(pn.data, dict) else {}
        req = pd.get("requirement")
        st = pd.get("status")
        if not isinstance(req, str):
            continue
        if st not in ("pass", "fail", "open"):
            continue
        row: dict[str, object] = {"requirement": req, "status": st}
        row["id"] = str(pn.id)
        pass_criteria.append(row)

    result_obj: dict[str, object] | None = None
    result_summary: str | None = None
    for rn in result_nodes:
        rd = rn.data if isinstance(rn.data, dict) else None
        if rd is None:
            continue
        summary = rd.get("summary")
        passed = rd.get("passed")
        total = rd.get("total")
        if isinstance(summary, str) and isinstance(passed, int) and isinstance(total, int):
            out: dict[str, object] = {
                "summary": summary,
                "passed": passed,
                "total": total,
            }
            crit = rd.get("criteria")
            if crit is not None:
                out["criteria"] = crit
            result_obj = out
            result_summary = summary
            break

    status = _derive_rail_status(pass_criteria, result_summary)

    out_m: dict[str, object] = {
        "id": str(milestone.id),
        "title": milestone.name,
        "order": _milestone_order(milestone.data),
        "passCriteria": pass_criteria,
        "status": status,
        "dataTask": _milestone_data_task(milestone.data),
    }
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
    milestone_ids = [m.id for m in milestones_raw]
    children_by_parent: dict[int, list[Node]] = {mid: [] for mid in milestone_ids}
    if milestone_ids:
        all_children = (
            session.query(Node)
            .filter(
                Node.parent_id.in_(milestone_ids),
                Node.location_id == root.location_id,
            )
            .order_by(Node.created_at.asc())
            .all()
        )
        for c in all_children:
            children_by_parent.setdefault(c.parent_id, []).append(c)

    milestones = [_serialize_milestone(children_by_parent.get(m.id, []), m) for m in milestones_raw]

    c_data = root.data if isinstance(root.data, dict) else {}
    goal = _workflow_goal_from_data(c_data)

    exported_at = datetime.now(UTC).isoformat().replace("+00:00", "Z")

    payload: dict[str, object] = {
        "schemaVersion": SCHEMA_VERSION,
        "workflowId": str(root.id),
        "workflowName": root.name,
        "exportedAt": exported_at,
        "milestones": milestones,
    }
    if goal is not None:
        payload["goal"] = goal
    else:
        payload["goal"] = None

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
