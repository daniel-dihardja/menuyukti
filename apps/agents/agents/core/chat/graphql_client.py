"""GraphQL helpers for chat milestone features (milestone row + mutations)."""

from __future__ import annotations

from typing import Any

import httpx
from agents_app.agents.graphql_base import graphql_post
from agents_app.agents.graphql_operations import (
    NODE_BY_ID_QUERY,
    REPLACE_PASS_CRITERIA_MUTATION,
    UPDATE_NODE_MUTATION,
)


async def fetch_milestone_node(
    milestone_id: str,
    user_id: str,
    *,
    client: httpx.AsyncClient,
) -> dict[str, Any] | None:
    """Return the milestone node (typed milestone fields + ``data``) or None."""
    data = await graphql_post(client, NODE_BY_ID_QUERY, {"id": milestone_id}, user_id)
    raw = data.get("node")
    return raw if isinstance(raw, dict) else None


async def upsert_milestone_goal(
    milestone_id: str,
    goal_text: str,
    user_id: str,
    *,
    client: httpx.AsyncClient,
) -> None:
    """Set ``milestone_goal`` via ``updateNode`` (column-backed)."""
    patch: dict[str, str | None] = (
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
