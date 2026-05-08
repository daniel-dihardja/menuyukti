"""GraphQL helpers for chat milestone features (goal, pass criteria, milestonedata)."""

from __future__ import annotations

from typing import Any

import httpx
from agents_app.agents.graphql_base import graphql_post
from agents_app.agents.graphql_operations import (
    DEFAULT_NODES_FIRST,
    NODE_BY_ID_QUERY,
    NODES_QUERY,
    UPDATE_NODE_MUTATION,
)


def _node_type(ch: dict[str, Any]) -> str:
    return str(ch.get("nodeType") or ch.get("node_type") or "")


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
    """Merge ``goal`` into the milestone node's ``data`` JSON; empty text removes ``goal``."""
    node = await fetch_milestone_node(milestone_id, user_id, client=client)
    if not isinstance(node, dict):
        msg = "milestone not found"
        raise RuntimeError(msg)
    raw = node.get("data")
    base: dict[str, Any] = dict(raw) if isinstance(raw, dict) else {}
    if not goal_text.strip():
        base.pop("goal", None)
    else:
        base["goal"] = goal_text
    upd = await graphql_post(
        client,
        UPDATE_NODE_MUTATION,
        {"id": milestone_id, "data": base},
        user_id,
    )
    if not isinstance(upd.get("updateNode"), dict):
        msg = "updateNode returned invalid payload"
        raise RuntimeError(msg)


async def replace_pass_criteria(
    milestone_id: str,
    _location_id: int,
    requirements: list[str],
    user_id: str,
    *,
    client: httpx.AsyncClient,
) -> None:
    """Replace milestone.data.passCriterias with fresh rows (status ``open``)."""
    reqs = [r for r in requirements if isinstance(r, str) and r.strip()]
    node_data = await graphql_post(client, NODE_BY_ID_QUERY, {"id": milestone_id}, user_id)
    raw_node = node_data.get("node")
    if not isinstance(raw_node, dict):
        msg = "milestone not found"
        raise RuntimeError(msg)
    raw_data = raw_node.get("data")
    milestone_data = raw_data if isinstance(raw_data, dict) else {}
    next_data = dict(milestone_data)
    next_data["passCriterias"] = [
        {"id": f"pc-{index + 1}", "requirement": requirement, "status": "open"}
        for index, requirement in enumerate(reqs)
    ]
    data = await graphql_post(
        client,
        UPDATE_NODE_MUTATION,
        {"id": milestone_id, "data": next_data},
        user_id,
    )
    if not isinstance(data.get("updateNode"), dict):
        msg = "updateNode returned invalid payload"
        raise RuntimeError(msg)
