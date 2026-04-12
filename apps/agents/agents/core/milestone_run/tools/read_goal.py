"""LangChain tool: read milestone goal from run context."""

from __future__ import annotations

from typing import Any

from langchain_core.tools import BaseTool, tool


def make_read_goal_tool(context: dict[str, Any]) -> BaseTool:
    @tool
    def read_goal() -> str:
        """Return the milestone goal text (from the goal child node, loaded into context)."""
        g = context.get("goal", "")
        return g if isinstance(g, str) else str(g)

    return read_goal
