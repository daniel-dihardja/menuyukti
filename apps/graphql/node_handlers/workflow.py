"""Workflow root node: same create/update data behavior as generic; delete cascades children."""

from __future__ import annotations

from sqlalchemy.orm import Session

from graphql.data_sources import MilestoneAgentRun, Node
from graphql.node_handlers._generic import GenericHandler


def _child_sort_key(row: Node) -> tuple[object, int]:
    return (row.created_at or 0, row.id)


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
        for child in children:
            if child.location_id != node.location_id:
                raise ValueError("Node location mismatch")

        children.sort(key=_child_sort_key, reverse=True)
        for child in children:
            session.query(MilestoneAgentRun).filter(
                MilestoneAgentRun.milestone_node_id == child.id,
            ).delete(synchronize_session=False)
            session.delete(child)
            session.flush()
