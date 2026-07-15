"""GraphQL helpers for chat milestone features (milestone row + mutations)."""

from __future__ import annotations

from typing import Any

import httpx
from agents_app.agents.core.chat.http_context import get_chat_milestone_cache
from agents_app.agents.graphql_base import graphql_post
from agents_app.agents.graphql_operations import (
    NODE_BY_ID_QUERY,
    REPLACE_PASS_CRITERIA_MUTATION,
    UPDATE_NODE_MUTATION,
    WORKFLOW_CAMPAIGN_TREE_QUERY,
)


async def fetch_milestone_node(
    milestone_id: str,
    user_id: str,
    *,
    client: httpx.AsyncClient,
    query: str = NODE_BY_ID_QUERY,
    cache_key: str | None = "full",
) -> dict[str, Any] | None:
    """Return the milestone node (typed milestone fields + ``data``) or None."""
    if cache_key is not None:
        cache = get_chat_milestone_cache()
        memo_key = (milestone_id, f"{user_id}:{cache_key}")
        if memo_key in cache:
            return cache[memo_key]
    data = await graphql_post(client, query, {"id": milestone_id}, user_id)
    raw = data.get("node")
    node = raw if isinstance(raw, dict) else None
    if cache_key is not None:
        get_chat_milestone_cache()[(milestone_id, f"{user_id}:{cache_key}")] = node
    return node


async def fetch_workflow_campaign_tree(
    workflow_id: str,
    user_id: str,
    *,
    client: httpx.AsyncClient,
) -> dict[str, Any] | None:
    """Return workflow campaign tree payload or None when missing or unauthorized."""
    cache = get_chat_milestone_cache()
    memo_key = (workflow_id, f"{user_id}:workflow_overview")
    if memo_key in cache:
        cached = cache[memo_key]
        return cached if isinstance(cached, dict) else None

    data = await graphql_post(
        client,
        WORKFLOW_CAMPAIGN_TREE_QUERY,
        {"workflowId": workflow_id},
        user_id,
    )
    raw = data.get("workflowCampaignTree")
    tree = raw if isinstance(raw, dict) else None
    cache[memo_key] = tree
    return tree


async def upsert_milestone_goal(
    milestone_id: str,
    goal_text: str,
    user_id: str,
    *,
    client: httpx.AsyncClient,
) -> None:
    """Set ``milestone_goal`` via ``updateNode`` (column-backed)."""
    patch: dict[str, str | None] = (
        {"milestoneGoal": goal_text.strip()} if goal_text.strip() else {"milestoneGoal": None}
    )
    upd = await graphql_post(
        client,
        UPDATE_NODE_MUTATION,
        {"id": milestone_id, "data": patch},
        user_id,
    )
    if not isinstance(upd.get("updateNode"), dict):
        msg = "updateNode returned invalid payload"
        raise RuntimeError(msg)


async def replace_pass_criteria(
    milestone_id: str,
    location_id: int,
    requirements: list[str],
    user_id: str,
    *,
    client: httpx.AsyncClient,
) -> None:
    """Replace pass criteria via dedicated mutation (writes ``pass_criterias`` column)."""
    reqs = [r for r in requirements if isinstance(r, str) and r.strip()]
    data = await graphql_post(
        client,
        REPLACE_PASS_CRITERIA_MUTATION,
        {"milestoneId": milestone_id, "locationId": location_id, "requirements": reqs},
        user_id,
    )
    if not data.get("replacePassCriteria"):
        msg = "replacePassCriteria failed"
        raise RuntimeError(msg)


async def update_milestone_input(
    milestone_id: str,
    payload: Any,
    user_id: str,
    *,
    client: httpx.AsyncClient,
) -> dict[str, Any]:
    """Update ``milestoneInput`` on a milestone node via ``updateNode``."""
    upd = await graphql_post(
        client,
        UPDATE_NODE_MUTATION,
        {"id": milestone_id, "data": {"milestoneInput": payload}},
        user_id,
    )
    node = upd.get("updateNode")
    if not isinstance(node, dict):
        msg = "updateNode returned invalid payload"
        raise RuntimeError(msg)
    return node
