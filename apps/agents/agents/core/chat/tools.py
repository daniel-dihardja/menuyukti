"""LangChain tools for milestone data (chat assistant)."""

from __future__ import annotations

import json
from typing import Annotated, Any

from agents_app.agents.core.chat.graphql_client import fetch_milestone_node
from agents_app.agents.core.chat.http_context import get_chat_http_client
from langchain_core.runnables import RunnableConfig
from langchain_core.tools import InjectedToolArg, tool

# Keys that belong on typed GraphQL columns; strip from ``data`` for the residual section.
_DATA_KEYS_STRIPPED_FOR_RESIDUAL = frozenset(
    {
        "goal",
        "milestoneGoal",
        "milestoneInput",
        "passCriterias",
        "milestonePresetData",
        "milestoneResult",
    },
)


def _format_json(data: Any) -> str:
    try:
        return json.dumps(data, ensure_ascii=False, indent=2)
    except (TypeError, ValueError):
        return repr(data)


def _residual_milestone_data(node: dict[str, Any]) -> dict[str, Any] | None:
    raw = node.get("data")
    if not isinstance(raw, dict) or not raw:
        return None
    out = {k: v for k, v in raw.items() if k not in _DATA_KEYS_STRIPPED_FOR_RESIDUAL}
    return out or None


def _format_milestone_snapshot(milestone_id: str, node: dict[str, Any]) -> str:
    """Format milestone row fields returned by GraphQL (camelCase). No child nodes."""
    lines: list[str] = []
    lines.append("## Milestone")
    lines.append(f"- **id**: {milestone_id}")
    lines.append(f"- **name**: {node.get('name')!s}")
    lines.append(f"- **nodeType**: {node.get('nodeType')!s}")
    loc = node.get("locationId")
    if loc is not None:
        lines.append(f"- **locationId**: {loc}")

    goal = node.get("milestoneGoal")
    lines.append("")
    lines.append("## Goal")
    lines.append(goal.strip() if isinstance(goal, str) and goal.strip() else "(not set)")

    lines.append("")
    lines.append("## Input (milestoneInput)")
    inp = node.get("milestoneInput")
    if inp is None:
        lines.append("(not set)")
    else:
        lines.append(_format_json(inp))

    lines.append("")
    lines.append("## Pass criteria")
    pc = node.get("passCriterias")
    if pc is None:
        lines.append("(not set)")
    elif not isinstance(pc, list):
        lines.append(_format_json(pc))
    elif len(pc) == 0:
        lines.append("(none)")
    else:
        for i, row in enumerate(pc, start=1):
            if isinstance(row, dict):
                cid = row.get("id", "")
                req = row.get("requirement", "")
                st = row.get("status", "")
                lines.append(f"{i}. id={cid!s} | status={st!s} | requirement: {req!s}")
            else:
                lines.append(f"{i}. {_format_json(row)}")

    lines.append("")
    lines.append("## Eval result (milestoneResult)")
    mr = node.get("milestoneResult")
    if mr is None:
        lines.append("(not set)")
    else:
        lines.append(_format_json(mr))

    lines.append("")
    lines.append("## Preset / result data (milestonePresetData)")
    mpd = node.get("milestonePresetData")
    if mpd is None:
        lines.append("(not set)")
    else:
        lines.append(_format_json(mpd))

    residual = _residual_milestone_data(node)
    lines.append("")
    lines.append("## Other milestone.data")
    if residual is None:
        lines.append("(none)")
    else:
        lines.append(_format_json(residual))

    return "\n".join(lines)


@tool
async def get_milestone_data(config: Annotated[RunnableConfig, InjectedToolArg()]) -> str:
    """Load the selected milestone row: goal, input, pass criteria, eval result, and preset/structured data.

    All fields come from the milestone node (no child nodes). Call when the user asks about the
    currently selected milestone's inputs, outputs, criteria, or run payload."""
    c = config.get("configurable") or {}
    milestone_id = c.get("milestone_id")
    location_id = c.get("location_id")
    user_id = c.get("user_id")
    if not milestone_id or location_id is None or not user_id:
        return (
            "Milestone context is not available (no milestone selected or missing location). "
            "Answer from the conversation only, or ask the user to select a milestone."
        )
    client = get_chat_http_client()
    node = await fetch_milestone_node(str(milestone_id), str(user_id), client=client)
    if not node:
        return "Error: milestone not found."
    if str(node.get("nodeType") or "") != "milestone":
        return "Error: node is not a milestone."
    loc = node.get("locationId")
    if loc is not None and int(loc) != int(location_id):
        return "Error: milestone location does not match the campaign context."

    return _format_milestone_snapshot(str(milestone_id), node)
