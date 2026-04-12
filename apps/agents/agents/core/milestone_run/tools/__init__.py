"""LangChain tools for milestone run: read goal/criteria/data, write milestonedata."""

from __future__ import annotations

from collections.abc import Sequence
from typing import Any

import httpx
from agents_app.agents.core.milestone_run.tools.read_criteria import make_read_criteria_tool
from agents_app.agents.core.milestone_run.tools.read_data import make_read_data_tool
from agents_app.agents.core.milestone_run.tools.read_goal import make_read_goal_tool
from agents_app.agents.core.milestone_run.tools.read_prior_milestones_data import (
    make_read_prior_milestones_data_tool,
)
from agents_app.agents.core.milestone_run.tools.registry import make_extra_tools
from agents_app.agents.core.milestone_run.tools.workspace_adapter import (
    make_workspace_adapter_tools,
)
from agents_app.agents.core.milestone_run.tools.write_result_data import make_write_result_data_tool
from langchain_core.tools import BaseTool


def make_milestone_run_tools(
    context: dict[str, Any],
    milestone_id: str,
    location_id: int,
    user_id: str,
    *,
    client: httpx.AsyncClient,
    extra_tool_ids: Sequence[str] = (),
) -> list[BaseTool]:
    """Build bound tools that read/write :class:`~agents_app.agents.core.milestone_run.state.MilestoneRunState` fields.

    **Core reads** (always): ``read_goal``, ``read_criteria``, ``read_data``, ``read_prior_milestones_data`` — use \
    ``context`` (typically LangGraph state): ``goal``, ``raw_data``, ``criteria``, ``prior_milestones_data``.

    **Extra tools** (from skill YAML ``extra_tools``): optional capabilities registered in \
    ``tools.registry.EXTRA_TOOL_FACTORIES`` (e.g. ``get_public_holidays``).

    **Write** (always): ``write_result_data`` persists the Data tab (``result_data``, ``milestonedata_written``). \
    Criterion verdicts, summary, and the result node come from the graph ``finalize_eval`` step.

    When ``context`` includes ``api_adapter_tools`` (from GraphQL), one parameterless GET tool per active row is \
    appended after built-ins (LangChain name = ``tool_key``).
    """
    adapter_tools = make_workspace_adapter_tools(context, http_client=client)
    extra_tools = make_extra_tools(
        extra_tool_ids,
        location_id,
        user_id,
        client=client,
    )
    return [
        make_read_goal_tool(context),
        make_read_criteria_tool(context),
        make_read_data_tool(context),
        make_read_prior_milestones_data_tool(context),
        *extra_tools,
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
