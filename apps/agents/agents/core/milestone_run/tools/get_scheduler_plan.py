"""LangChain tool: fetch campaign schedule plan for Scheduler milestone."""

from __future__ import annotations

import json
from typing import Any

import httpx
from agents_app.agents.core.milestone_run.graphql_client import fetch_campaign_schedule_plan
from langchain_core.tools import BaseTool, tool

_JSON_SEPARATORS = (",", ":")


def make_get_scheduler_plan_tool(
    context: dict[str, Any],
    location_id: int,
    user_id: str,
    *,
    client: httpx.AsyncClient,
) -> BaseTool:
    @tool
    async def get_scheduler_plan() -> str:
        """Return adaptive campaign schedule rows from GraphQL as JSON text.

        Uses strict Dates milestone structured data for campaign start/end window.
        Requires `workflow_id` and `milestone_id` in the run context.
        """
        workflow_id = context.get("workflow_id")
        milestone_id = context.get("milestone_id")
        if not isinstance(workflow_id, str) or not workflow_id.strip():
            return (
                "Scheduler plan unavailable: missing workflow_id in run context. "
                "Run from a workflow-bound milestone."
            )
        if not isinstance(milestone_id, str) or not milestone_id.strip():
            return (
                "Scheduler plan unavailable: missing milestone_id in run context. "
                "Run from a workflow milestone."
            )

        raw = await fetch_campaign_schedule_plan(
            workflow_id.strip(),
            milestone_id.strip(),
            location_id,
            user_id,
            client=client,
        )
        if not isinstance(raw, dict):
            return (
                "Scheduler plan unavailable. Ensure a prior Dates milestone exists with "
                "valid startDate and endDate data before running Scheduler."
            )

        slots_raw = raw.get("slots")
        slots: list[dict[str, Any]] = []
        if isinstance(slots_raw, list):
            for row in slots_raw:
                if not isinstance(row, dict):
                    continue
                slots.append(
                    {
                        "dateTime": str(row.get("dateTime") or ""),
                        "type": str(row.get("postType") or "single"),
                        "promotedMenuItems": [
                            str(x)
                            for x in (row.get("promotedMenuItems") or [])
                            if isinstance(x, str) and x.strip()
                        ],
                        "visualIdea": str(row.get("visualIdea") or ""),
                        "captionIdea": str(row.get("captionIdea") or ""),
                    }
                )

        payload = {
            "analyticsRunId": raw.get("analyticsRunId"),
            "campaignStart": raw.get("campaignStart"),
            "campaignEnd": raw.get("campaignEnd"),
            "timezone": raw.get("timezone"),
            "postsPerWeek": int(raw.get("postsPerWeek") or 0),
            "sourceSignalsSummary": str(raw.get("sourceSignalsSummary") or ""),
            "slots": slots,
        }
        return json.dumps(payload, ensure_ascii=False, separators=_JSON_SEPARATORS)

    return get_scheduler_plan
