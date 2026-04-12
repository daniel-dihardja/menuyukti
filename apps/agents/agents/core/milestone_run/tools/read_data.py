"""LangChain tool: read milestone Data tab from run context."""

from __future__ import annotations

from typing import Any

from langchain_core.tools import BaseTool, tool


def make_read_data_tool(context: dict[str, Any]) -> BaseTool:
    @tool
    def read_data() -> str:
        """Return the current milestone Data tab content (Markdown in the milestonedata node)."""
        updated = context.get("result_data", "")
        if isinstance(updated, str) and updated.strip():
            return updated
        d = context.get("raw_data", "")
        return d if isinstance(d, str) else str(d)

    return read_data
