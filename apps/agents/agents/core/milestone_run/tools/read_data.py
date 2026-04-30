"""LangChain tool: read milestone output produced during the current run."""

from __future__ import annotations

from typing import Any

from langchain_core.tools import BaseTool, tool

READ_DATA_EMPTY_MESSAGE = "No milestone output has been written in this run yet."


def make_read_data_tool(context: dict[str, Any]) -> BaseTool:
    @tool
    def read_data() -> str:
        """Return JSON text for output written in this run (via write_result_data), else session raw_data.

        Does not return pre-run stored milestonedata; use read_goal, read_criteria, and other tools for inputs.
        """
        updated = context.get("result_data", "")
        if isinstance(updated, str) and updated.strip():
            return updated
        d = context.get("raw_data", "")
        if isinstance(d, str) and d.strip():
            return d
        return READ_DATA_EMPTY_MESSAGE

    return read_data
