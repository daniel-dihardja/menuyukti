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
from agents_app.agents.core.milestone_run.tools.workspace_adapter import (
    make_workspace_adapter_tools,
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
    """Build bound tools that read/write :class:`~agents_app.agents.core.milestone_run.state.MilestoneRunState` fields.

    **Core reads** (always): ``read_goal``, ``read_criteria``, ``read_data``, ``read_prior_milestones_data`` \
    — use ``context`` for ``goal``, ``criteria``, ``prior_milestones_data``. ``read_data`` returns only output written in \
    this run (``result_data`` / session ``raw_data`` after ``write_result_data``), not pre-loaded stored milestone JSON.

    **Write** (always): ``write_result_data`` persists milestone data (``result_data``, ``milestonedata_written``). \
    Criterion verdicts, summary, and the result node come from the graph ``finalize_eval`` step.

    When ``TAVILY_API_KEY`` is set, ``search_web`` (Tavily) is inserted after the read tools and before ``write_result_data``.

    When ``context`` includes ``api_adapter_tools`` (from GraphQL), one parameterless GET tool per active row is \
    appended after built-ins (LangChain name = ``tool_key``).
    """
    adapter_tools = make_workspace_adapter_tools(context, http_client=client)
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
        *adapter_tools,
    ]


__all__ = ["make_milestone_run_tools"]
