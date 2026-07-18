"""Prefetch compact workflow milestone catalog for chat system prompts."""

from __future__ import annotations

import logging

import httpx
from agents_app.agents.core.chat.graphql_client import fetch_workflow_campaign_tree
from agents_app.agents.core.chat.workflow_overview import format_workflow_overview_markdown

logger = logging.getLogger(__name__)

_CATALOG_UNAVAILABLE = (
    "(Workflow milestone catalog unavailable. "
    "Call get_workflow_overview if you need the current pipeline list.)"
)


async def load_workflow_catalog_markdown(
    *,
    workflow_id: str,
    user_id: str,
    location_id: int | None,
    selected_milestone_id: str | None,
    client: httpx.AsyncClient,
) -> str:
    """Load and format the workflow milestone catalog for system-prompt injection.

    Soft-fails with a short note on missing tree, location mismatch, or errors.
    Successful fetches seed the request-scoped workflow tree cache via
    ``fetch_workflow_campaign_tree``.
    """
    if location_id is None:
        return _CATALOG_UNAVAILABLE

    try:
        tree = await fetch_workflow_campaign_tree(workflow_id, user_id, client=client)
    except Exception:
        logger.exception(
            "Failed to load workflow catalog (workflow_id=%s)",
            workflow_id,
        )
        return _CATALOG_UNAVAILABLE

    if not tree:
        return _CATALOG_UNAVAILABLE

    workflow = tree.get("workflow")
    if isinstance(workflow, dict):
        wf_loc = workflow.get("locationId")
        if wf_loc is not None and int(wf_loc) != int(location_id):
            return _CATALOG_UNAVAILABLE

    selected = str(selected_milestone_id) if selected_milestone_id is not None else None
    return format_workflow_overview_markdown(tree, selected_milestone_id=selected)
