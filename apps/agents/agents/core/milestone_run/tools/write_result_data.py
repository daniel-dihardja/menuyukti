"""LangChain tool: upsert milestonedata node and update run context."""

from __future__ import annotations

import json
import re
from typing import Any

import httpx
from agents_app.agents.core.milestone_run.graphql_client import upsert_milestonedata_node
from agents_app.agents.core.milestone_run.output_schema import validate_skill_output
from langchain_core.tools import BaseTool, tool


def _contains_forbidden_snapshot_text(value: str) -> bool:
    text = value.strip().lower()
    if not text:
        return False
    if any(term in text for term in ("start date", "end date", "campaign", "window")):
        return True
    if re.search(r"\b\d{4}-\d{2}-\d{2}\b", text):
        return True
    if re.search(r"\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b", text):
        return True
    if re.search(
        r"\b(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\s*[-/]\s*"
        r"(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\s+\d{4}\b",
        text,
    ):
        return True
    return bool(re.search(r"\bq[1-4]\s+\d{4}\b", text))


def _sanitize_venue_name(venue_name: str) -> str:
    cleaned = venue_name.strip()
    if not cleaned:
        return cleaned
    # Remove trailing parenthetical campaign/date windows, e.g. "Dev (Jan-Mar 2025)".
    return re.sub(
        r"\s*\((?:q[1-4]\s+\d{4}|"
        r"(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\s*[-/]\s*"
        r"(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\s+\d{4})\)\s*$",
        "",
        cleaned,
        flags=re.IGNORECASE,
    ).strip()


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

        Persisted ``node.data`` is the **flat** preset JSON (e.g. dates: startDate, endDate,
        publicHolidays), not wrapped in an extra ``{"data": ...}`` object.

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
        if (
            selected_skill_id == "brand_brief"
            and isinstance(payload, dict)
            and isinstance(payload.get("venueSnapshot"), dict)
        ):
            venue_snapshot = payload["venueSnapshot"]
            old_name = str(venue_snapshot.get("venueName", ""))
            new_name = _sanitize_venue_name(old_name)
            if new_name and new_name != old_name:
                venue_snapshot["venueName"] = new_name
        normalized, error = validate_skill_output(selected_skill_id, payload)
        if error is not None:
            skill_label = selected_skill_id or "unknown"
            return (
                f"Output validation failed for skill '{skill_label}'. "
                "Use the expected structured JSON shape for this milestone skill and retry. "
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
