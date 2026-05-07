"""Dedicated LangGraph for deterministic post-scheduler execution."""

from __future__ import annotations

from functools import partial

import httpx
from agents_app.agents.core.milestone_run.post_scheduler.nodes import (
    derive_day_summary,
    fetch_and_prepare,
    persist_result,
)
from agents_app.agents.core.milestone_run.post_scheduler.state import PostSchedulerState
from langgraph.graph import END, START, StateGraph


def build_post_scheduler_graph(client: httpx.AsyncClient):
    """Compile dedicated post-scheduler graph for deterministic prefetch output."""
    builder = StateGraph(PostSchedulerState)
    builder.add_node("fetch_and_prepare", partial(fetch_and_prepare, client=client))
    builder.add_node("derive_day_summary", derive_day_summary)
    builder.add_node("persist_result", partial(persist_result, client=client))
    builder.add_edge(START, "fetch_and_prepare")
    builder.add_edge("fetch_and_prepare", "derive_day_summary")
    builder.add_edge("derive_day_summary", "persist_result")
    builder.add_edge("persist_result", END)
    return builder.compile()
