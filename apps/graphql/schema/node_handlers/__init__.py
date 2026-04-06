"""Registry of node-type handlers for generic create/update/delete mutations."""

from __future__ import annotations

from graphql.schema.node_handlers._generic import GenericHandler
from graphql.schema.node_handlers.base import NodeHandler
from graphql.schema.node_handlers.campaign import CampaignHandler
from graphql.schema.node_handlers.goal import GoalHandler
from graphql.schema.node_handlers.milestone import MilestoneHandler
from graphql.schema.node_handlers.milestonedata import MilestoneDataHandler
from graphql.schema.node_handlers.passcriteria import PassCriteriaHandler

_GENERIC_HANDLER = GenericHandler()

_REGISTRY: dict[str, NodeHandler] = {
    "campaign": CampaignHandler(),
    "milestone": MilestoneHandler(),
    "passcriteria": PassCriteriaHandler(),
    "goal": GoalHandler(),
    "milestonedata": MilestoneDataHandler(),
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
    "CampaignHandler",
    "GenericHandler",
    "GoalHandler",
    "MilestoneDataHandler",
    "MilestoneHandler",
    "NodeHandler",
    "PassCriteriaHandler",
    "get_handler",
]
