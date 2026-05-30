"""LangChain tools for milestone run: read goal/criteria/data, write milestonedata."""

from __future__ import annotations

from typing import Any

import httpx
from agents_app.agents.core.milestone_run.tools.read_criteria import make_read_criteria_tool
from agents_app.agents.core.milestone_run.tools.read_data import make_read_data_tool
from agents_app.agents.core.milestone_run.tools.read_goal import make_read_goal_tool
from agents_app.agents.core.milestone_run.tools.read_prior_milestones_data import (
    make_read_prior_milestones_data_tool,
)
from agents_app.agents.core.milestone_run.tools.write_result_data import make_write_result_data_tool
from agents_app.agents.core.tavily_search_tool import make_search_web_tool
from langchain_core.tools import BaseTool


def make_milestone_run_tools(
    context: dict[str, Any],
    milestone_id: str,
    location_id: int,
    user_id: str,
    *,
    client: httpx.AsyncClient,
) -> list[BaseTool]:
    """Build LangChain read/write tools for **unit tests and legacy callers only**.

    Production milestone runs use dedicated preset ``StateGraph`` modules, not this ReAct bundle.
    """
    optional_web = make_search_web_tool()
    reads: list[BaseTool] = [
        make_read_goal_tool(context),
        make_read_criteria_tool(context),
        make_read_data_tool(context),
        make_read_prior_milestones_data_tool(context),
    ]
    if optional_web is not None:
        reads.append(optional_web)
    return [
        *reads,
        make_write_result_data_tool(
            context,
            milestone_id,
            location_id,
            user_id,
            client=client,
        ),
    ]


__all__ = ["make_milestone_run_tools"]
