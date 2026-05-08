"""Create a workflow root and milestone tree from an export payload (new DB ids)."""

from __future__ import annotations

import secrets
from typing import Any

import strawberry
from sqlalchemy.orm import Session
from strawberry.scalars import JSON

from graphql.data_sources import Node, SessionLocal
from graphql.schema.auth import require_location_owner, user_id_from_info
from graphql.schema.milestone_payload_validation import (
    validate_pass_criteria_list,
    validate_result_payload,
)
from graphql.schema.node_gql import node_to_gql
from graphql.schema.node_handlers import get_handler
from graphql.schema.types import NodeType

_PASS_STATUSES = frozenset({"pass", "fail", "open"})


def _flush_with_path(session: Session, node: Node, parent: Node | None) -> None:
    session.add(node)
    session.flush()
    if parent is None:
        node.path = f"/{node.id}"
    else:
        node.path = f"{parent.path.rstrip('/')}/{node.id}"


def _milestone_dict_sort_key(m: dict[str, Any]) -> tuple[int, int]:
    raw_o = m.get("order")
    ord_v = raw_o if isinstance(raw_o, int) else 0
    mid = m.get("id")
    try:
        id_v = int(str(mid)) if mid is not None else 0
    except ValueError:
        id_v = 0
    return (ord_v, id_v)


def _create_milestone_node(
    session: Session,
    root_node: Node,
    m: dict[str, Any],
    location_id: int,
) -> None:
    title = m.get("title")
    name = title.strip() if isinstance(title, str) and title.strip() else "Milestone"

    raw_order = m.get("order")
    order_val = raw_order if isinstance(raw_order, int) else 0

    milestone_data: dict[str, Any] = {"order": order_val}
    preset_raw = m.get("presetId")
    if isinstance(preset_raw, str) and preset_raw.strip():
        milestone_data["presetId"] = preset_raw.strip()

    milestone = Node(
        parent_id=root_node.id,
        name=name,
        description=None,
        path="",
        node_type="milestone",
        location_id=location_id,
        data=milestone_data,
    )
    _flush_with_path(session, milestone, root_node)

    goal_raw = m.get("goal")
    if isinstance(goal_raw, str) and goal_raw.strip():
        milestone.milestone_goal = goal_raw.strip()

    pcs_raw = m.get("passCriteria")
    pcs_list: list[Any] = pcs_raw if isinstance(pcs_raw, list) else []
    built_pc: list[dict[str, Any]] = []
    for pc in pcs_list:
        if not isinstance(pc, dict):
            continue
        req = pc.get("requirement")
        st = pc.get("status")
        cid = pc.get("id")
        if not isinstance(req, str):
            continue
        if st not in _PASS_STATUSES:
            continue
        built_pc.append(
            {
                "id": str(cid).strip()
                if isinstance(cid, str) and cid.strip()
                else secrets.token_hex(8),
                "requirement": req,
                "status": st,
            }
        )
    if built_pc:
        validate_pass_criteria_list(built_pc)
        milestone.pass_criterias = built_pc

    data_raw = m.get("data")
    if isinstance(data_raw, dict):
        milestone.milestone_preset_data = dict(data_raw)

    result_raw = m.get("result")
    if isinstance(result_raw, dict):
        summary = result_raw.get("summary")
        passed = result_raw.get("passed")
        total = result_raw.get("total")
        if isinstance(summary, str) and isinstance(passed, int) and isinstance(total, int):
            rd: dict[str, Any] = {
                "summary": summary,
                "passed": passed,
                "total": total,
            }
            crit = result_raw.get("criteria")
            if crit is not None:
                rd["criteria"] = crit
            validate_result_payload(rd)
            milestone.milestone_result = rd


def _import_from_payload(session: Session, location_id: int, payload: object) -> Node:
    if not isinstance(payload, dict):
        raise ValueError("payload must be a JSON object")

    raw_name = payload.get("workflowName")
    if not isinstance(raw_name, str) or not raw_name.strip():
        raise ValueError("payload must include a non-empty workflowName string")

    raw_milestones = payload.get("milestones")
    if not isinstance(raw_milestones, list):
        raise ValueError("payload must include a milestones array")

    handler = get_handler("workflow")
    resolved_root = handler.validate_create(None, None, session)

    root_node = Node(
        parent_id=None,
        name=raw_name.strip(),
        description=None,
        path="",
        node_type="workflow",
        location_id=location_id,
        data=resolved_root,
    )
    _flush_with_path(session, root_node, None)

    milestone_dicts = [x for x in raw_milestones if isinstance(x, dict)]
    milestone_dicts.sort(key=_milestone_dict_sort_key)

    for m in milestone_dicts:
        _create_milestone_node(session, root_node, m, location_id)

    session.commit()
    session.refresh(root_node)
    return root_node


@strawberry.type
class ImportWorkflowMutation:
    @strawberry.mutation
    def import_workflow(
        self,
        info: strawberry.Info,
        location_id: int,
        payload: JSON,
    ) -> NodeType:
        user_id = user_id_from_info(info)
        if not user_id:
            raise ValueError("Missing authenticated user for importWorkflow")

        with SessionLocal() as session:
            require_location_owner(session, location_id, user_id)
            root_node = _import_from_payload(session, location_id, payload)
            return node_to_gql(root_node)
