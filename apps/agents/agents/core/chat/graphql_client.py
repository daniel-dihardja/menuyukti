"""GraphQL helpers for chat milestone features (goal, pass criteria, milestonedata)."""

from __future__ import annotations

from typing import Any

import httpx
from agents_app.agents.graphql_base import graphql_post
from agents_app.agents.graphql_operations import (
    DEFAULT_NODES_FIRST,
    NODE_BY_ID_QUERY,
    NODES_QUERY,
    REPLACE_PASS_CRITERIA_MUTATION,
    UPDATE_NODE_MUTATION,
)


async def fetch_milestone_node(
    milestone_id: str,
    user_id: str,
    *,
    client: httpx.AsyncClient,
) -> dict[str, Any] | None:
    """Return the milestone node row (name, locationId, data JSON) or None."""
    data = await graphql_post(client, NODE_BY_ID_QUERY, {"id": milestone_id}, user_id)
    raw = data.get("node")
    return raw if isinstance(raw, dict) else None


async def fetch_milestone_children(
    milestone_id: str,
    location_id: int,
    user_id: str,
    *,
    client: httpx.AsyncClient,
) -> list[dict[str, Any]]:
    """Child nodes under the milestone (milestonedata, passcriteria, result)."""
    data = await graphql_post(
        client,
        NODES_QUERY,
        {
            "locationId": location_id,
            "nodeType": None,
            "parentId": milestone_id,
            "first": DEFAULT_NODES_FIRST,
        },
        user_id,
    )
    raw = data.get("nodes")
    if not isinstance(raw, list):
        return []
    return [item for item in raw if isinstance(item, dict)]


async def upsert_milestone_goal(
    milestone_id: str,
    goal_text: str,
    user_id: str,
    *,
    client: httpx.AsyncClient,
) -> None:
    """Set ``milestone_goal`` via ``updateNode`` (column-backed)."""
    patch = (
        {"milestoneGoal": goal_text.strip()}
        if goal_text.strip()
        else {"milestoneGoal": None}
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
