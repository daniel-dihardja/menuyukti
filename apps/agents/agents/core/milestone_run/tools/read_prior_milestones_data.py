"""LangChain tool: read prior milestones' Data tabs from run context."""

from __future__ import annotations

from typing import Any

from langchain_core.tools import BaseTool, tool


def make_read_prior_milestones_data_tool(context: dict[str, Any]) -> BaseTool:
    @tool
    def read_prior_milestones_data() -> str:
        """Return Markdown from earlier milestones in this workflow (their Data tabs).

        Call when the current Data tab is missing context (e.g. campaign dates) that a previous
        milestone should have set. Empty or unavailable if the run was not scoped to a workflow.
        """
        d = context.get("prior_milestones_data", "")
        if isinstance(d, str) and d.strip():
            return d
        return "No prior milestone data available."

    return read_prior_milestones_data
