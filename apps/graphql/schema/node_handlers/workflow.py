"""Workflow root node: same create/update data behavior as generic; delete cascades to milestones."""

from __future__ import annotations

from sqlalchemy.orm import Session

from graphql.data_sources import Node
from graphql.schema.node_handlers._generic import GenericHandler
from graphql.schema.node_handlers.milestone import _milestone_sort_key, delete_milestone_children


class WorkflowHandler(GenericHandler):
    node_type = "workflow"

    def validate_create(
        self,
        parent: Node | None,
        data: dict | None,
        session: Session | None = None,
    ) -> dict | None:
        if parent is not None:
            raise ValueError(
                "Workflow must be a root node (no parent); use locationId to scope the workflow"
            )
        return super().validate_create(parent, data, session)

    def pre_delete(self, node: Node, parent: Node | None, session: Session) -> None:
        if node.node_type != "workflow":
            raise ValueError("Expected workflow node")
        if node.location_id is None:
            raise ValueError("Workflow has no location")

        children = session.query(Node).filter(Node.parent_id == node.id).all()
        milestones: list[Node] = []
        for child in children:
            if child.node_type != "milestone":
                raise ValueError(f"Unexpected child node type under workflow: {child.node_type}")
            if child.location_id != node.location_id:
                raise ValueError("Node location mismatch")
            milestones.append(child)

        milestones.sort(key=_milestone_sort_key, reverse=True)
        for m in milestones:
            delete_milestone_children(session, m.id)
            session.delete(m)
            session.flush()
