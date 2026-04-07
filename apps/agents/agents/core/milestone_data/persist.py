"""Save generated Markdown into the milestone `milestonedata` node."""

from __future__ import annotations

import httpx
from agents_app.agents.core.milestone_data.graphql_client import upsert_milestonedata


async def persist_milestonedata_markdown(
    milestone_id: str,
    location_id: int,
    user_id: str,
    markdown: str,
    *,
    client: httpx.AsyncClient,
) -> str:
    """
    Persist text to the single `milestonedata` child under ``milestone_id``.

    Returns the node id as a string (empty if missing from the payload).
    """
    node = await upsert_milestonedata(
        milestone_id,
        location_id,
        markdown,
        user_id,
        client=client,
    )
    return str(node.get("id", ""))
