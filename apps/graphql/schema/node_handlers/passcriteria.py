"""Passcriteria nodes: under milestone; validated JSON payload."""

from __future__ import annotations

from sqlalchemy.orm import Session

from graphql.data_sources import Node
from graphql.schema.node_handlers.base import NodeHandler

_PASS_CRITERIA_STATUSES = frozenset({"pass", "fail", "open"})


def _validate_passcriteria_payload(data: dict) -> None:
    requirement = data.get("requirement")
    status = data.get("status")
    if not isinstance(requirement, str):
        raise ValueError("passcriteria requirement must be a string")
    if status not in _PASS_CRITERIA_STATUSES:
        raise ValueError("passcriteria status must be pass, fail, or open")


class PassCriteriaHandler(NodeHandler):
    node_type = "passcriteria"

    def validate_create(
        self,
        parent: Node | None,
        data: dict | None,
        session: Session | None = None,
    ) -> dict | None:
        if parent is None:
            raise ValueError("passcriteria nodes must have a parent milestone")
        if parent.node_type != "milestone":
            raise ValueError("passcriteria parent must be a milestone")
        if data is None:
            return {"requirement": "", "status": "open"}
        if not isinstance(data, dict):
            raise ValueError("passcriteria data must be a JSON object")
        base_pc = {"requirement": "", "status": "open"}
        base_pc.update(data)
        _validate_passcriteria_payload(base_pc)
        return base_pc

    def validate_update(self, node: Node, parent: Node | None, data: dict | None) -> None:
        if data is not None and not isinstance(data, dict):
            raise ValueError("data must be a JSON object")
        if node.parent_id is None:
            raise ValueError("passcriteria has no parent")
        if parent is None:
            raise ValueError("Parent node not found")
        if parent.node_type != "milestone":
            raise ValueError("passcriteria parent must be a milestone")
        if parent.location_id != node.location_id:
            raise ValueError("Node location mismatch")

    def merge_update_data(self, node: Node, patch: dict) -> dict:
        base = dict(node.data) if isinstance(node.data, dict) else {}
        base.update(patch)
        _validate_passcriteria_payload(base)
        return base

    def pre_delete(self, node: Node, parent: Node | None, session: Session) -> None:
        if node.parent_id is None:
            raise ValueError("passcriteria has no parent")
        if parent is None:
            raise ValueError("Parent node not found")
        if parent.node_type != "milestone":
            raise ValueError("passcriteria parent must be a milestone")
        if parent.location_id != node.location_id:
            raise ValueError("Node location mismatch")
