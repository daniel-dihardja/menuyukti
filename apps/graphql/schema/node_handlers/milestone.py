"""Milestone nodes: under campaign; LIFO delete; optional JSON data on update."""

from __future__ import annotations

from sqlalchemy.orm import Session

from graphql.data_sources import Node
from graphql.schema.node_handlers.base import NodeHandler


class MilestoneHandler(NodeHandler):
    node_type = "milestone"

    def validate_create(self, parent: Node | None, data: dict | None) -> dict | None:
        return data

    def validate_update(self, node: Node, parent: Node | None, data: dict | None) -> None:
        if data is not None and not isinstance(data, dict):
            raise ValueError("data must be a JSON object")
        if node.parent_id is None:
            raise ValueError("Milestone has no parent")
        if parent is None:
            raise ValueError("Parent node not found")
        if parent.node_type != "campaign":
            raise ValueError("Milestone parent must be a campaign")
        if parent.location_id != node.location_id:
            raise ValueError("Node location mismatch")

    def pre_delete(self, node: Node, parent: Node | None, session: Session) -> None:
        if node.parent_id is None:
            raise ValueError("Milestone has no parent")
        if parent is None:
            raise ValueError("Parent node not found")
        if parent.node_type != "campaign":
            raise ValueError("Milestone parent must be a campaign")
        if parent.location_id != node.location_id:
            raise ValueError("Node location mismatch")

        last_sibling = (
            session.query(Node)
            .filter(
                Node.location_id == node.location_id,
                Node.parent_id == node.parent_id,
                Node.node_type == "milestone",
            )
            .order_by(Node.created_at.desc(), Node.id.desc())
            .first()
        )
        if last_sibling is None or last_sibling.id != node.id:
            raise ValueError("Only the last milestone can be deleted")

        session.query(Node).filter(
            Node.parent_id == node.id,
            Node.node_type == "passcriteria",
        ).delete(synchronize_session=False)

