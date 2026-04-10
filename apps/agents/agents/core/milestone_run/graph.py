"""LangGraph: fetch milestone inputs, then ReAct agent with milestone run tools."""

from __future__ import annotations

import logging
from functools import partial
from typing import Any

import httpx
from agents_app.agents.core.milestone_eval.nodes import fetch_context
from agents_app.agents.core.milestone_run.prompts import (
    MILESTONE_RUN_SYSTEM,
    milestone_run_task_message,
)
from agents_app.agents.core.milestone_run.state import MilestoneRunState
from agents_app.agents.core.milestone_run.tools import make_milestone_run_tools
from agents_app.models.llm_config import get_llm
from langchain_core.messages import HumanMessage
from langgraph.config import get_stream_writer
from langgraph.graph import END, START, StateGraph
from langgraph.prebuilt import create_react_agent

_logger = logging.getLogger(__name__)


async def _fetch_inputs(state: MilestoneRunState, *, client: httpx.AsyncClient) -> dict[str, Any]:
    mid = str(state["milestone_id"])
    _logger.info("milestone_run.fetch_inputs: start milestone_id=%s location_id=%s", mid, state["location_id"])
    try:
        out = await fetch_context(state, client=client)  # type: ignore[arg-type]
    except Exception:
        _logger.exception("milestone_run.fetch_inputs: failed milestone_id=%s", mid)
        raise
    _logger.info(
        "milestone_run.fetch_inputs: done milestone_id=%s criteria_count=%s goal_len=%s raw_data_len=%s",
        mid,
        len(out.get("criteria") or []),
        len(str(out.get("goal") or "")),
        len(str(out.get("raw_data") or "")),
    )
    return out


async def _run_milestone_agent(
    state: MilestoneRunState, *, client: httpx.AsyncClient
) -> dict[str, Any]:
    mid = str(state["milestone_id"])
    _logger.info("milestone_run.run_agent: start milestone_id=%s", mid)
    writer = get_stream_writer()
    writer({"step": "run_agent"})
    tools = make_milestone_run_tools(
        state,  # same mapping tools mutate; must not copy
        str(state["milestone_id"]),
        int(state["location_id"]),
        str(state["user_id"]),
        client=client,
    )
    llm = get_llm()
    agent = create_react_agent(llm, tools, prompt=MILESTONE_RUN_SYSTEM)
    await agent.ainvoke({"messages": [HumanMessage(content=milestone_run_task_message())]})
    raw_last = state.get("last_criteria_verdicts", [])
    last_verdicts = list(raw_last) if isinstance(raw_last, list) else []
    _logger.info(
        "milestone_run.run_agent: done milestone_id=%s result_node_id=%s verdict_count=%s",
        mid,
        state.get("result_node_id"),
        len(last_verdicts),
    )
    return {
        "result_data": str(state.get("result_data", "")),
        "milestonedata_written": bool(state.get("milestonedata_written")),
        "result_summary": str(state.get("result_summary", "")),
        "result_node_id": state.get("result_node_id"),
        "last_criteria_verdicts": last_verdicts,
    }


def build_milestone_run_graph(client: httpx.AsyncClient):
    """Compile graph; pass a shared async HTTP client for GraphQL calls."""
    builder = StateGraph(MilestoneRunState)
    builder.add_node("fetch_inputs", partial(_fetch_inputs, client=client))
    builder.add_node("run_agent", partial(_run_milestone_agent, client=client))
    builder.add_edge(START, "fetch_inputs")
    builder.add_edge("fetch_inputs", "run_agent")
    builder.add_edge("run_agent", END)
    return builder.compile()
