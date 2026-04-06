"""Result nodes: single child under milestone; AI evaluation output payload."""

from __future__ import annotations

from sqlalchemy.orm import Session

from graphql.data_sources import Node
from graphql.schema.node_handlers.base import NodeHandler


def _validate_result_payload(data: dict) -> None:
    summary = data.get("summary")
    if not isinstance(summary, str):
        raise ValueError("result data must include a string field summary")
    passed = data.get("passed")
    total = data.get("total")
    if not isinstance(passed, int):
        raise ValueError("result data must include an integer field passed")
    if not isinstance(total, int):
        raise ValueError("result data must include an integer field total")
    criteria = data.get("criteria")
    if criteria is not None and not isinstance(criteria, list):
        raise ValueError("result criteria must be a list when present")


class ResultHandler(NodeHandler):
    node_type = "result"

    def validate_create(
        self,
        parent: Node | None,
        data: dict | None,
        session: Session | None = None,
    ) -> dict | None:
        if parent is None:
            raise ValueError("result nodes must have a parent milestone")
        if parent.node_type != "milestone":
            raise ValueError("result parent must be a milestone")
        if session is None:
            raise ValueError("Session required to create result")

        existing = (
            session.query(Node)
            .filter(
                Node.location_id == parent.location_id,
                Node.parent_id == parent.id,
                Node.node_type == "result",
            )
            .count()
        )
        if existing > 0:
            raise ValueError("Milestone already has a result node")

        if data is None:
            base = {"summary": "", "passed": 0, "total": 0, "criteria": []}
        elif not isinstance(data, dict):
            raise ValueError("result data must be a JSON object")
        else:
            base = {"summary": "", "passed": 0, "total": 0, "criteria": []}
            base.update(data)
        _validate_result_payload(base)
        return base

    def validate_update(self, node: Node, parent: Node | None, data: dict | None) -> None:
        if data is not None and not isinstance(data, dict):
            raise ValueError("data must be a JSON object")
        if node.parent_id is None:
            raise ValueError("result has no parent")
        if parent is None:
            raise ValueError("Parent node not found")
        if parent.node_type != "milestone":
            raise ValueError("result parent must be a milestone")
        if parent.location_id != node.location_id:
            raise ValueError("Node location mismatch")

    def merge_update_data(self, node: Node, patch: dict) -> dict:
        base = dict(node.data) if isinstance(node.data, dict) else {}
        base.update(patch)
        _validate_result_payload(base)
        return base

    def pre_delete(self, node: Node, parent: Node | None, session: Session) -> None:
        if node.parent_id is None:
            raise ValueError("result has no parent")
        if parent is None:
            raise ValueError("Parent node not found")
        if parent.node_type != "milestone":
            raise ValueError("result parent must be a milestone")
        if parent.location_id != node.location_id:
            raise ValueError("Node location mismatch")
