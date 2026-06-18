"""Registry of node-type handlers for generic create/update/delete mutations."""

from __future__ import annotations

from graphql.node_handlers._generic import GenericHandler
from graphql.node_handlers.base import NodeHandler
from graphql.node_handlers.milestone import MilestoneHandler
from graphql.node_handlers.workflow import WorkflowHandler

_GENERIC_HANDLER = GenericHandler()

_REGISTRY: dict[str, NodeHandler] = {
    "workflow": WorkflowHandler(),
    "milestone": MilestoneHandler(),
}


def get_handler(node_type: str | None) -> NodeHandler:
    """Return the handler for `node_type`, or the generic fallback."""
    if node_type is None:
        return _GENERIC_HANDLER
    key = node_type.strip()
    if not key:
        return _GENERIC_HANDLER
    return _REGISTRY.get(key, _GENERIC_HANDLER)


__all__ = [
    "WorkflowHandler",
    "GenericHandler",
    "MilestoneHandler",
    "NodeHandler",
    "get_handler",
]
