"""LangChain tool: upsert milestonedata node and update run context."""

from __future__ import annotations

from typing import Any

import httpx
from agents_app.agents.core.milestone_run.graphql_client import upsert_milestonedata_node
from langchain_core.tools import BaseTool, tool


def make_write_result_data_tool(
    context: dict[str, Any],
    milestone_id: str,
    location_id: int,
    user_id: str,
    *,
    client: httpx.AsyncClient,
) -> BaseTool:
    @tool
    async def write_result_data(new_data: str) -> str:
        """Upsert the milestonedata child under this milestone with the given Markdown body.

        Updates context ``result_data`` and returns a short confirmation including the node id.
        """
        node = await upsert_milestonedata_node(
            milestone_id,
            location_id,
            new_data,
            user_id,
            client=client,
        )
        nid = str(node.get("id", ""))
        context["result_data"] = new_data
        context["milestonedata_written"] = True
        return f"Saved milestonedata node id={nid} ({len(new_data)} characters)."

    return write_result_data
