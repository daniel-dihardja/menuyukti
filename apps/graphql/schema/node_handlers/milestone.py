"""Milestone nodes: under workflow root; any milestone may be deleted; optional JSON data on update."""

from __future__ import annotations

from typing import Any

from sqlalchemy.orm import Session

from graphql.data_sources import MilestoneAgentRun, Node
from graphql.schema.milestone_payload_validation import (
    validate_pass_criteria_list,
    validate_result_payload,
)
from graphql.schema.node_handlers.base import NodeHandler


def _milestone_sort_key(row: Node) -> tuple[int, object, int]:
    """Sort milestones: primary `data.order` (int), then created_at, then id."""
    d = row.data if isinstance(row.data, dict) else {}
    raw = d.get("order")
    order = raw if isinstance(raw, int) else 0
    return (order, row.created_at or 0, row.id)


def delete_milestone_children(session: Session, milestone_id: int) -> None:
    """Remove persisted agent runs under a milestone (milestone payloads live on the milestone row)."""
    session.query(MilestoneAgentRun).filter(
        MilestoneAgentRun.milestone_node_id == milestone_id,
    ).delete(synchronize_session=False)


def _strip_legacy_milestone_json_keys(base: dict[str, Any]) -> None:
    """Goal, input, criteria, preset, and result are stored in columns; keep ``data`` for order/presetId flags."""
    for k in (
        "goal",
        "milestoneGoal",
        "milestoneInput",
        "passCriterias",
        "milestonePresetData",
        "milestoneResult",
    ):
        base.pop(k, None)


def sync_milestone_columns_from_initial_data(node: Node) -> None:
    """After inserting a milestone row, copy JSON ``data`` keys into typed columns and slim ``data``."""
    base = dict(node.data) if isinstance(node.data, dict) else {}
    g = base.get("goal")
    if isinstance(g, str) and g.strip():
        node.milestone_goal = g.strip()

    mi = base.get("milestoneInput")
    if mi is not None:
        node.milestone_input = mi

    pc = base.get("passCriterias")
    if isinstance(pc, list) and pc:
        validate_pass_criteria_list(pc)
        node.pass_criterias = pc

    mpd = base.get("milestonePresetData")
    if mpd is not None:
        if isinstance(mpd, (dict, list)):
            node.milestone_preset_data = mpd
        else:
            raise ValueError("milestonePresetData must be a JSON object or array when set")

    mr = base.get("milestoneResult")
    if mr is not None:
        if isinstance(mr, dict):
            validate_result_payload(mr)
            node.milestone_result = mr
        else:
            raise ValueError("milestoneResult must be a JSON object when set")

    _strip_legacy_milestone_json_keys(base)
    node.data = base


class MilestoneHandler(NodeHandler):
    node_type = "milestone"

    def validate_create(
        self,
        parent: Node | None,
        data: dict | None,
        session: Session | None = None,
    ) -> dict | None:
        if parent is None:
            raise ValueError("Milestone must have a parent workflow")
        if parent.node_type != "workflow":
            raise ValueError("Milestone parent must be a workflow root")
        if session is None:
            raise ValueError("Session required to create milestone")

        count = (
            session.query(Node)
            .filter(
                Node.location_id == parent.location_id,
                Node.parent_id == parent.id,
                Node.node_type == "milestone",
            )
            .count()
        )
        next_order = count + 1
        base: dict = dict(data) if isinstance(data, dict) else {}
        base["order"] = next_order
        return base

    def validate_update(self, node: Node, parent: Node | None, data: dict | None) -> None:
        if data is not None and not isinstance(data, dict):
            raise ValueError("data must be a JSON object")
        if node.parent_id is None:
            raise ValueError("Milestone has no parent")
        if parent is None:
            raise ValueError("Parent node not found")
        if parent.node_type != "workflow":
            raise ValueError("Milestone parent must be a workflow root")
        if parent.location_id != node.location_id:
            raise ValueError("Node location mismatch")

    def merge_update_data(self, node: Node, patch: dict) -> dict:
        base: dict[str, Any] = dict(node.data) if isinstance(node.data, dict) else {}
        base.update(patch)

        if "milestoneGoal" in patch:
            g = patch.get("milestoneGoal")
            node.milestone_goal = (
                g.strip() if isinstance(g, str) and g.strip() else None  # type: ignore[assignment]
            )
        elif "goal" in patch:
            g = patch.get("goal")
            node.milestone_goal = (
                g.strip() if isinstance(g, str) and g.strip() else None  # type: ignore[assignment]
            )

        if "milestoneInput" in patch:
            node.milestone_input = patch.get("milestoneInput")

        if "passCriterias" in patch:
            pc = patch.get("passCriterias")
            if pc is None:
                node.pass_criterias = None
            else:
                validate_pass_criteria_list(pc)
                node.pass_criterias = pc

        if "milestonePresetData" in patch:
            mpd = patch.get("milestonePresetData")
            if mpd is None:
                node.milestone_preset_data = None
            elif isinstance(mpd, (dict, list)):
                node.milestone_preset_data = mpd
            else:
                raise ValueError("milestonePresetData must be a JSON object or array when set")

        if "milestoneResult" in patch:
            mr = patch.get("milestoneResult")
            if mr is None:
                node.milestone_result = None
            elif isinstance(mr, dict):
                validate_result_payload(mr)
                node.milestone_result = mr
            else:
                raise ValueError("milestoneResult must be a JSON object when set")

        _strip_legacy_milestone_json_keys(base)
        return base

    def pre_delete(self, node: Node, parent: Node | None, session: Session) -> None:
        if node.parent_id is None:
            raise ValueError("Milestone has no parent")
        if parent is None:
            raise ValueError("Parent node not found")
        if parent.node_type != "workflow":
            raise ValueError("Milestone parent must be a workflow root")
        if parent.location_id != node.location_id:
            raise ValueError("Node location mismatch")

        delete_milestone_children(session, node.id)
