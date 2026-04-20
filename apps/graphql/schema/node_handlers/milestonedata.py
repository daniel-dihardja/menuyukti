"""Milestone data nodes: single child under milestone; payload `{data: str | object}`."""

from __future__ import annotations

from sqlalchemy.orm import Session

from graphql.data_sources import Node
from graphql.schema.node_handlers.base import NodeHandler


def _validate_milestonedata_payload(data: dict) -> None:
    raw = data.get("data")
    if isinstance(raw, str):
        return
    if isinstance(raw, dict):
        return
    raise ValueError("milestonedata must include a string or object field data")


class MilestoneDataHandler(NodeHandler):
    node_type = "milestonedata"

    def validate_create(
        self,
        parent: Node | None,
        data: dict | None,
        session: Session | None = None,
    ) -> dict | None:
        if parent is None:
            raise ValueError("milestonedata nodes must have a parent milestone")
        if parent.node_type != "milestone":
            raise ValueError("milestonedata parent must be a milestone")
        if session is None:
            raise ValueError("Session required to create milestonedata")

        existing = (
            session.query(Node)
            .filter(
                Node.location_id == parent.location_id,
                Node.parent_id == parent.id,
                Node.node_type == "milestonedata",
            )
            .count()
        )
        if existing > 0:
            raise ValueError("Milestone already has a milestonedata node")

        if data is None:
            return {"data": ""}
        if not isinstance(data, dict):
            raise ValueError("milestonedata must be a JSON object")
        base = {"data": ""}
        base.update(data)
        _validate_milestonedata_payload(base)
        return base

    def validate_update(self, node: Node, parent: Node | None, data: dict | None) -> None:
        if data is not None and not isinstance(data, dict):
            raise ValueError("data must be a JSON object")
        if node.parent_id is None:
            raise ValueError("milestonedata has no parent")
        if parent is None:
            raise ValueError("Parent node not found")
        if parent.node_type != "milestone":
            raise ValueError("milestonedata parent must be a milestone")
        if parent.location_id != node.location_id:
            raise ValueError("Node location mismatch")

    def merge_update_data(self, node: Node, patch: dict) -> dict:
        base = dict(node.data) if isinstance(node.data, dict) else {}
        base.update(patch)
        _validate_milestonedata_payload(base)
        return base

    def pre_delete(self, node: Node, parent: Node | None, session: Session) -> None:
        if node.parent_id is None:
            raise ValueError("milestonedata has no parent")
        if parent is None:
            raise ValueError("Parent node not found")
        if parent.node_type != "milestone":
            raise ValueError("milestonedata parent must be a milestone")
        if parent.location_id != node.location_id:
            raise ValueError("Node location mismatch")
