"""Goal nodes: single child under milestone; payload `{goal: str}`."""

from __future__ import annotations

from sqlalchemy.orm import Session

from graphql.data_sources import Node
from graphql.schema.node_handlers.base import NodeHandler


def _validate_goal_payload(data: dict) -> None:
    goal = data.get("goal")
    if not isinstance(goal, str):
        raise ValueError("goal data must include a string field goal")


class GoalHandler(NodeHandler):
    node_type = "goal"

    def validate_create(
        self,
        parent: Node | None,
        data: dict | None,
        session: Session | None = None,
    ) -> dict | None:
        if parent is None:
            raise ValueError("goal nodes must have a parent milestone")
        if parent.node_type != "milestone":
            raise ValueError("goal parent must be a milestone")
        if session is None:
            raise ValueError("Session required to create goal")

        existing = (
            session.query(Node)
            .filter(
                Node.location_id == parent.location_id,
                Node.parent_id == parent.id,
                Node.node_type == "goal",
            )
            .count()
        )
        if existing > 0:
            raise ValueError("Milestone already has a goal node")

        if data is None:
            return {"goal": ""}
        if not isinstance(data, dict):
            raise ValueError("goal data must be a JSON object")
        base = {"goal": ""}
        base.update(data)
        _validate_goal_payload(base)
        return base

    def validate_update(self, node: Node, parent: Node | None, data: dict | None) -> None:
        if data is not None and not isinstance(data, dict):
            raise ValueError("data must be a JSON object")
        if node.parent_id is None:
            raise ValueError("goal has no parent")
        if parent is None:
            raise ValueError("Parent node not found")
        if parent.node_type != "milestone":
            raise ValueError("goal parent must be a milestone")
        if parent.location_id != node.location_id:
            raise ValueError("Node location mismatch")

    def merge_update_data(self, node: Node, patch: dict) -> dict:
        base = dict(node.data) if isinstance(node.data, dict) else {}
        base.update(patch)
        _validate_goal_payload(base)
        return base

    def pre_delete(self, node: Node, parent: Node | None, session: Session) -> None:
        if node.parent_id is None:
            raise ValueError("goal has no parent")
        if parent is None:
            raise ValueError("Parent node not found")
        if parent.node_type != "milestone":
            raise ValueError("goal parent must be a milestone")
        if parent.location_id != node.location_id:
            raise ValueError("Node location mismatch")
