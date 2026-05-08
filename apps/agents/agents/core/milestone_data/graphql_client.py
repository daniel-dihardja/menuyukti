"""GraphQL: persist preset payload on the milestone row (`milestone_preset_data`)."""

from __future__ import annotations

from typing import Any

import httpx
from agents_app.agents.graphql_base import graphql_post
from agents_app.agents.graphql_operations import UPDATE_NODE_MUTATION


async def upsert_milestonedata(
    milestone_id: str,
    location_id: int,
    payload: Any,
    user_id: str,
    *,
    client: httpx.AsyncClient,
) -> dict[str, Any]:
    """Set ``milestone_preset_data`` on the milestone node (replaces milestonedata child pattern)."""
    _ = location_id
    upd = await graphql_post(
        client,
        UPDATE_NODE_MUTATION,
        {"id": milestone_id, "data": {"milestonePresetData": payload}},
        user_id,
    )
    node = upd.get("updateNode")
    if not isinstance(node, dict):
        msg = "updateNode returned invalid payload"
        raise RuntimeError(msg)
    return node
