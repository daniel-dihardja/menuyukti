"""GraphQL helpers for chat milestone features (goal, pass criteria, milestonedata)."""

from __future__ import annotations

from typing import Any

import httpx
from agents_app.agents.graphql_base import graphql_post
from agents_app.agents.graphql_operations import (
    CREATE_NODE_MUTATION,
    DEFAULT_NODES_FIRST,
    DELETE_NODE_MUTATION,
    NODE_BY_ID_QUERY,
    NODES_QUERY,
    REPLACE_PASS_CRITERIA_MUTATION,
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
    """Child nodes under the milestone (goal, milestonedata, passcriteria, result)."""
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


async def upsert_goal_node(
    milestone_id: str,
    location_id: int,
    goal_text: str,
    user_id: str,
    *,
    client: httpx.AsyncClient,
) -> None:
    """Create or update the single `goal` child; empty text deletes goal nodes."""
    data = await graphql_post(
        client,
        NODES_QUERY,
        {
            "locationId": location_id,
            "nodeType": "goal",
            "parentId": milestone_id,
            "first": DEFAULT_NODES_FIRST,
        },
        user_id,
    )
    raw_nodes = data.get("nodes")
    rows: list[dict[str, Any]] = []
    if isinstance(raw_nodes, list):
        for item in raw_nodes:
            if isinstance(item, dict) and _node_type(item) == "goal":
                rows.append(item)

    if not goal_text.strip():
        for g in rows:
            gid = g.get("id")
            if gid is not None:
                await graphql_post(client, DELETE_NODE_MUTATION, {"id": str(gid)}, user_id)
        return

    if not rows:
        gql = await graphql_post(
            client,
            CREATE_NODE_MUTATION,
            {
                "locationId": location_id,
                "nodeType": "goal",
                "parentId": milestone_id,
                "name": "Goal",
                "data": {"goal": goal_text},
            },
            user_id,
        )
        node = gql.get("createNode")
        if not isinstance(node, dict):
            msg = "createNode returned invalid payload"
            raise RuntimeError(msg)
        return

    primary, *rest = rows
    for extra in rest:
        eid = extra.get("id")
        if eid is not None:
            await graphql_post(client, DELETE_NODE_MUTATION, {"id": str(eid)}, user_id)

    pid = primary.get("id")
    if pid is None:
        msg = "goal node missing id"
        raise RuntimeError(msg)
    upd = await graphql_post(
        client,
        UPDATE_NODE_MUTATION,
        {"id": str(pid), "data": {"goal": goal_text}},
        user_id,
    )
    node = upd.get("updateNode")
    if not isinstance(node, dict):
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
    """Delete all passcriteria children and create new rows with status ``open``."""
    reqs = [r for r in requirements if isinstance(r, str) and r.strip()]
    data = await graphql_post(
        client,
        REPLACE_PASS_CRITERIA_MUTATION,
        {
            "milestoneId": milestone_id,
            "locationId": location_id,
            "requirements": reqs,
        },
        user_id,
    )
    if not data.get("replacePassCriteria"):
        msg = "replacePassCriteria returned false"
        raise RuntimeError(msg)
