"""Dedicated LangGraph for deterministic post-scheduler execution."""

from __future__ import annotations

from functools import partial

import httpx
from agents_app.agents.core.milestone_run.post_scheduler.nodes import (
    fetch_and_prepare,
    generate_campaign_concepts,
    persist_result,
)
from agents_app.agents.core.milestone_run.post_scheduler.state import PostSchedulerState
from langgraph.graph import END, START, StateGraph


def build_post_scheduler_graph(client: httpx.AsyncClient):
    """Compile dedicated post-scheduler graph for date-centric concept generation."""
    builder = StateGraph(PostSchedulerState)
    builder.add_node("fetch_and_prepare", partial(fetch_and_prepare, client=client))
    builder.add_node("generate_campaign_concepts", generate_campaign_concepts)
    builder.add_node("persist_result", partial(persist_result, client=client))
    builder.add_edge(START, "fetch_and_prepare")
    builder.add_edge("fetch_and_prepare", "generate_campaign_concepts")
    builder.add_edge("generate_campaign_concepts", "persist_result")
    builder.add_edge("persist_result", END)
    return builder.compile()
