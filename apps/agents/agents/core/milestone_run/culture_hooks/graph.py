"""Dedicated LangGraph for deterministic culture-hooks execution."""

from __future__ import annotations

from functools import partial

import httpx
from agents_app.agents.core.milestone_run.culture_hooks.nodes import (
    fetch_and_prepare,
    generate_intersections,
    persist_result,
    research_local_culture,
)
from agents_app.agents.core.milestone_run.culture_hooks.state import CultureHooksState
from langgraph.graph import END, START, StateGraph


def build_culture_hooks_graph(client: httpx.AsyncClient):
    """Compile dedicated culture-hooks graph for campaign-brief-based intersections."""
    builder = StateGraph(CultureHooksState)
    builder.add_node("fetch_and_prepare", partial(fetch_and_prepare, client=client))
    builder.add_node("research_local_culture", research_local_culture)
    builder.add_node("generate_intersections", generate_intersections)
    builder.add_node("persist_result", partial(persist_result, client=client))
    builder.add_edge(START, "fetch_and_prepare")
    builder.add_edge("fetch_and_prepare", "research_local_culture")
    builder.add_edge("research_local_culture", "generate_intersections")
    builder.add_edge("generate_intersections", "persist_result")
    builder.add_edge("persist_result", END)
    return builder.compile()
