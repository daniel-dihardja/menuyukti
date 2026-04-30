"""Save payload into the milestone `milestonedata` node (flat preset JSON object)."""

from __future__ import annotations

from typing import Any

import httpx
from agents_app.agents.core.milestone_data.graphql_client import upsert_milestonedata


async def persist_milestonedata(
    milestone_id: str,
    location_id: int,
    user_id: str,
    payload: Any,
    *,
    client: httpx.AsyncClient,
) -> str:
    """
    Persist content to the single `milestonedata` child under ``milestone_id``.

    ``payload`` is stored as the ``milestonedata`` node's ``data`` JSON object (preset shape).

    Returns the node id as a string (empty if missing from the payload).
    """
    node = await upsert_milestonedata(
        milestone_id,
        location_id,
        payload,
        user_id,
        client=client,
    )
    return str(node.get("id", ""))
