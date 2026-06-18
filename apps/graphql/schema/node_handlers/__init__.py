"""Backward-compatible re-exports; prefer graphql.node_handlers."""

from graphql.node_handlers import (
    GenericHandler,
    MilestoneHandler,
    NodeHandler,
    WorkflowHandler,
    get_handler,
)
from graphql.node_handlers.milestone import (
    _milestone_sort_key,
    delete_milestone_children,
    sync_milestone_columns_from_initial_data,
)

__all__ = [
    "GenericHandler",
    "MilestoneHandler",
    "NodeHandler",
    "WorkflowHandler",
    "_milestone_sort_key",
    "delete_milestone_children",
    "get_handler",
    "sync_milestone_columns_from_initial_data",
]
