"""Fallback handler for node types without dedicated rules (extensible JSON)."""

from __future__ import annotations

from sqlalchemy.orm import Session

from graphql.data_sources import Node
from graphql.node_handlers.base import NodeHandler


class GenericHandler(NodeHandler):
    """Permissive create; permissive JSON data updates for unregistered types (location is enforced in mutations)."""

    node_type = "generic"

    def validate_create(
        self,
        parent: Node | None,
        data: dict | None,
        session: Session | None = None,
    ) -> dict | None:
        return data

    def validate_update(self, node: Node, parent: Node | None, data: dict | None) -> None:
        if data is not None and not isinstance(data, dict):
            raise ValueError("data must be a JSON object")

    def pre_delete(self, node: Node, parent: Node | None, session: Session) -> None:
        """Allow deleting extension node types (location ownership already enforced)."""
        return
