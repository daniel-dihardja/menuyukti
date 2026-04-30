"""GraphQL: create/update `milestonedata` node under a milestone."""

from __future__ import annotations

from typing import Any

import httpx
from agents_app.agents.graphql_base import graphql_post
from agents_app.agents.graphql_operations import (
    CREATE_NODE_MUTATION,
    DEFAULT_NODES_FIRST,
    DELETE_NODE_MUTATION,
    NODES_QUERY,
    UPDATE_NODE_MUTATION,
)


async def upsert_milestonedata(
    milestone_id: str,
    location_id: int,
    payload: Any,
    user_id: str,
    *,
    client: httpx.AsyncClient,
) -> dict[str, Any]:
    """Create or update the single `milestonedata` child under the milestone."""

    data = await graphql_post(
        client,
        NODES_QUERY,
        {
            "locationId": location_id,
            "nodeType": "milestonedata",
            "parentId": milestone_id,
            "first": DEFAULT_NODES_FIRST,
        },
        user_id,
    )
    raw_nodes = data.get("nodes")
    rows: list[dict[str, Any]] = []
    if isinstance(raw_nodes, list):
        for item in raw_nodes:
            if isinstance(item, dict) and str(item.get("nodeType", "")) == "milestonedata":
                rows.append(item)

    if not rows:
        gql = await graphql_post(
            client,
            CREATE_NODE_MUTATION,
            {
                "locationId": location_id,
                "nodeType": "milestonedata",
                "parentId": milestone_id,
                "name": "Data",
                "data": payload,
            },
            user_id,
        )
        node = gql.get("createNode")
        if not isinstance(node, dict):
            msg = "createNode returned invalid payload"
            raise RuntimeError(msg)
        return node

    primary, *rest = rows
    for extra in rest:
        eid = extra.get("id")
        if eid is not None:
            await graphql_post(client, DELETE_NODE_MUTATION, {"id": str(eid)}, user_id)

    pid = primary.get("id")
    if pid is None:
        msg = "milestonedata node missing id"
        raise RuntimeError(msg)
    upd = await graphql_post(
        client,
        UPDATE_NODE_MUTATION,
        {"id": str(pid), "data": payload},
        user_id,
    )
    node = upd.get("updateNode")
    if not isinstance(node, dict):
        msg = "updateNode returned invalid payload"
        raise RuntimeError(msg)
    return node
