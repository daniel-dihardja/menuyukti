"""Backward-compatible re-exports; prefer graphql.node_handlers."""

from graphql.node_handlers import (
    GenericHandler,
    NodeHandler,
    WorkflowHandler,
    get_handler,
)

__all__ = [
    "GenericHandler",
    "NodeHandler",
    "WorkflowHandler",
    "get_handler",
]
