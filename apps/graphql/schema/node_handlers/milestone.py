"""Milestone nodes: under workflow root; LIFO delete by display order; optional JSON data on update."""

from __future__ import annotations

from sqlalchemy.orm import Session

from graphql.data_sources import Node
from graphql.schema.node_handlers.base import NodeHandler


def _milestone_sort_key(row: Node) -> tuple[int, object, int]:
    """Sort milestones: primary `data.order` (int), then created_at, then id."""
    d = row.data if isinstance(row.data, dict) else {}
    raw = d.get("order")
    order = raw if isinstance(raw, int) else 0
    return (order, row.created_at or 0, row.id)


def delete_milestone_children(session: Session, milestone_id: int) -> None:
    """Remove goal, passcriteria, milestonedata, and result rows under a milestone."""
    session.query(Node).filter(
        Node.parent_id == milestone_id,
        Node.node_type == "goal",
    ).delete(synchronize_session=False)

    session.query(Node).filter(
        Node.parent_id == milestone_id,
        Node.node_type == "passcriteria",
    ).delete(synchronize_session=False)

    session.query(Node).filter(
        Node.parent_id == milestone_id,
        Node.node_type == "milestonedata",
    ).delete(synchronize_session=False)

    session.query(Node).filter(
        Node.parent_id == milestone_id,
        Node.node_type == "result",
    ).delete(synchronize_session=False)


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

    def pre_delete(self, node: Node, parent: Node | None, session: Session) -> None:
        if node.parent_id is None:
            raise ValueError("Milestone has no parent")
        if parent is None:
            raise ValueError("Parent node not found")
        if parent.node_type != "workflow":
            raise ValueError("Milestone parent must be a workflow root")
        if parent.location_id != node.location_id:
            raise ValueError("Node location mismatch")

        siblings = (
            session.query(Node)
            .filter(
                Node.location_id == node.location_id,
                Node.parent_id == node.parent_id,
                Node.node_type == "milestone",
            )
            .all()
        )
        if not siblings:
            raise ValueError("Milestone siblings not found")

        last_sibling = max(siblings, key=_milestone_sort_key)
        if last_sibling.id != node.id:
            raise ValueError("Only the last milestone can be deleted")

        delete_milestone_children(session, node.id)
