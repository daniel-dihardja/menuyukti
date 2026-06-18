"""Abstract node handler: per-node-type strategy for create/update/delete."""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import TYPE_CHECKING

from sqlalchemy.orm import Session

if TYPE_CHECKING:
    from graphql.data_sources import Node


class NodeHandler(ABC):
    """Strategy for validating and transforming node operations by `node_type`."""

    node_type: str = "generic"

    @abstractmethod
    def validate_create(
        self,
        parent: Node | None,
        data: dict | None,
        session: Session | None = None,
    ) -> dict | None:
        """Return resolved `data` for persistence (defaults merged, shape validated)."""
        ...

    def validate_update(self, node: Node, parent: Node | None, data: dict | None) -> None:
        """Raise ValueError if update is not allowed or parent context is invalid."""
        raise ValueError("This node type does not allow updates with this mutation")

    def merge_update_data(self, node: Node, patch: dict) -> dict:
        """Merge patch into existing node.data and return the new payload."""
        base = dict(node.data) if isinstance(node.data, dict) else {}
        base.update(patch)
        return base

    def pre_delete(self, node: Node, parent: Node | None, session: Session) -> None:
        """Run type-specific checks and cascades before deleting `node`."""
        raise ValueError("Only milestone and passcriteria nodes can be deleted with this mutation")
