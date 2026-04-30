"""LangChain tools for milestone data (chat assistant)."""

from __future__ import annotations

import json
from typing import Any

import httpx
from agents_app.agents.core.chat.graphql_client import (
    fetch_milestone_children,
    fetch_milestone_node,
)
from langchain_core.tools import tool


def _format_json(data: Any) -> str:
    try:
        return json.dumps(data, ensure_ascii=False, indent=2)
    except (TypeError, ValueError):
        return repr(data)


def _format_milestone_snapshot(
    milestone_id: str,
    node: dict[str, Any],
    children: list[dict[str, Any]],
) -> str:
    lines: list[str] = []
    lines.append("## Milestone")
    lines.append(f"- **id**: {milestone_id}")
    lines.append(f"- **name**: {node.get('name')!s}")
    lines.append(f"- **nodeType**: {node.get('nodeType')!s}")
    loc = node.get("locationId")
    if loc is not None:
        lines.append(f"- **locationId**: {loc}")
    raw_data = node.get("data")
    if isinstance(raw_data, dict) and raw_data:
        lines.append("- **milestone.data**:")
        lines.append(_format_json(raw_data))
    elif raw_data is not None:
        lines.append(f"- **milestone.data**: {_format_json(raw_data)}")

    lines.append("")
    lines.append("## Child nodes")

    if not children:
        lines.append("(none)")
        return "\n".join(lines)

    for ch in children:
        nt = str(ch.get("nodeType") or "")
        cid = ch.get("id")
        cname = ch.get("name")
        raw = ch.get("data")
        data = raw if isinstance(raw, dict) else {}
        lines.append(f"### {nt} (id={cid}, name={cname!s})")
        if nt == "goal":
            g = data.get("goal")
            lines.append(f"- goal: {g!s}" if isinstance(g, str) else f"- goal: {g!r}")
        elif nt == "milestonedata":
            lines.append(f"- data: {_format_json(data)}")
        elif nt == "passcriteria":
            req = data.get("requirement", "")
            st = data.get("status", "")
            lines.append(f"- requirement: {req!s}")
            lines.append(f"- status: {st!s}")
        elif nt == "result":
            for key in ("summary", "passed", "total", "criteria"):
                if key in data:
                    lines.append(f"- {key}: {_format_json(data[key])}")
            if not any(k in data for k in ("summary", "passed", "total", "criteria")):
                lines.append(_format_json(data))
        else:
            lines.append(_format_json(data))
        lines.append("")

    return "\n".join(lines).rstrip()


def make_get_milestone_data_tool(
    milestone_id: str,
    location_id: int,
    user_id: str,
    *,
    client: httpx.AsyncClient,
):
    """Build a bound tool that reads goal, pass criteria, milestone data, and result from GraphQL."""

    @tool
    async def get_milestone_data() -> str:
        """Load the selected milestone and its child nodes (goal, milestone data, pass criteria, result).

        Call when the user asks to see milestone data, goal, pass criteria,
        or similar for the currently selected milestone."""
        node = await fetch_milestone_node(milestone_id, user_id, client=client)
        if not node:
            return "Error: milestone not found."
        if str(node.get("nodeType") or "") != "milestone":
            return "Error: node is not a milestone."
        loc = node.get("locationId")
        if loc is not None and int(loc) != location_id:
            return "Error: milestone location does not match the campaign context."

        children = await fetch_milestone_children(milestone_id, location_id, user_id, client=client)
        return _format_milestone_snapshot(milestone_id, node, children)

    return get_milestone_data
