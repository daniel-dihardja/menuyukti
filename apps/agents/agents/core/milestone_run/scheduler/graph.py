"""Dedicated LangGraph for scheduler execution."""

from __future__ import annotations

from functools import partial

import httpx
from agents_app.agents.core.milestone_run.scheduler.nodes import (
    build_snapshot,
    fetch_and_prepare,
    persist_result,
    select_holiday_greetings,
)
from agents_app.agents.core.milestone_run.scheduler.state import SchedulerState
from langgraph.graph import END, START, StateGraph


def build_scheduler_graph(client: httpx.AsyncClient):
    """Compile dedicated scheduler graph."""
    builder = StateGraph(SchedulerState)
    builder.add_node("fetch_and_prepare", partial(fetch_and_prepare, client=client))
    builder.add_node("select_holiday_greetings", select_holiday_greetings)
    builder.add_node("build_snapshot", build_snapshot)
    builder.add_node("persist_result", partial(persist_result, client=client))
    builder.add_edge(START, "fetch_and_prepare")
    builder.add_edge("fetch_and_prepare", "select_holiday_greetings")
    builder.add_edge("select_holiday_greetings", "build_snapshot")
    builder.add_edge("build_snapshot", "persist_result")
    builder.add_edge("persist_result", END)
    return builder.compile()
