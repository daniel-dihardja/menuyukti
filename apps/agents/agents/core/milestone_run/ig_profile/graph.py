"""Dedicated LangGraph for deterministic IG profile execution."""

from __future__ import annotations

from functools import partial

import httpx
from agents_app.agents.core.milestone_run.ig_profile.nodes import (
    fetch_and_prepare,
    generate_profile,
    persist_result,
)
from agents_app.agents.core.milestone_run.ig_profile.state import IgProfileState
from langgraph.graph import END, START, StateGraph


def build_ig_profile_graph(client: httpx.AsyncClient):
    """Compile dedicated IG profile graph for campaign-brief-based suggestions."""
    builder = StateGraph(IgProfileState)
    builder.add_node("fetch_and_prepare", partial(fetch_and_prepare, client=client))
    builder.add_node("generate_profile", generate_profile)
    builder.add_node("persist_result", partial(persist_result, client=client))
    builder.add_edge(START, "fetch_and_prepare")
    builder.add_edge("fetch_and_prepare", "generate_profile")
    builder.add_edge("generate_profile", "persist_result")
    builder.add_edge("persist_result", END)
    return builder.compile()
