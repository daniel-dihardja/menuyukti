"""LangChain tool: upsert milestonedata node and update run context."""

from __future__ import annotations

import json
from typing import Any

import httpx
from agents_app.agents.core.milestone_run.output_schema import validate_scheduler_output
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
    async def write_result_data(new_data: Any) -> str:
        """Upsert the milestonedata child under this milestone with the given payload.

        Updates context ``result_data`` and returns a short confirmation including the node id.
        """
        payload: Any = new_data
        if isinstance(new_data, str):
            try:
                parsed_json = json.loads(new_data)
            except Exception:
                parsed_json = None
            if isinstance(parsed_json, dict):
                payload = parsed_json

        selected_skill_id = context.get("selected_skill_id")
        if selected_skill_id == "scheduler":
            normalized, error = validate_scheduler_output(payload)
            if error is not None:
                return (
                    "Scheduler output validation failed. Expected "
                    '{"schedules":[{"dateTime","type","promotedMenuItems","visualIdea","captionIdea"}]}. '
                    f"Validation error: {error}"
                )
            payload = normalized

        node = await upsert_milestonedata_node(
            milestone_id,
            location_id,
            payload,
            user_id,
            client=client,
        )
        nid = str(node.get("id", ""))
        context["milestone_data"] = payload
        context["result_data"] = (
            json.dumps(payload, ensure_ascii=False, indent=2)
            if isinstance(payload, (dict, list))
            else str(payload)
        )
        context["raw_data"] = context["result_data"]
        context["milestonedata_written"] = True
        return f"Saved milestonedata node id={nid} ({len(context['result_data'])} characters)."

    return write_result_data
