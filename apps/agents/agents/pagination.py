"""Shared cursor/list pagination helpers for GraphQL operations."""

from __future__ import annotations

from typing import Any

import httpx
from agents_app.agents.graphql_base import graphql_post
from agents_app.agents.graphql_operations import DEFAULT_NODES_FIRST, NODES_QUERY


async def fetch_nodes_page(
    client: httpx.AsyncClient,
    *,
    location_id: int,
    user_id: str,
    node_type: str | None = None,
    parent_id: str | None = None,
    first: int = DEFAULT_NODES_FIRST,
    after_id: str | None = None,
) -> list[dict[str, Any]]:
    """Fetch a single page from nodes(locationId, first, afterId)."""
    data = await graphql_post(
        client,
        NODES_QUERY,
        {
            "locationId": location_id,
            "nodeType": node_type,
            "parentId": parent_id,
            "first": first,
            "afterId": after_id,
        },
        user_id,
    )
    raw = data.get("nodes")
    if not isinstance(raw, list):
        return []
    return [item for item in raw if isinstance(item, dict)]

