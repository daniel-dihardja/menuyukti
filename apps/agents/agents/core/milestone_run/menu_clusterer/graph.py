"""Dedicated LangGraph for menu_clusterer execution."""

from __future__ import annotations

from functools import partial

import httpx
from agents_app.agents.core.milestone_run.menu_clusterer.nodes import (
    build_clusters,
    fetch_and_prepare,
    persist_result,
)
from agents_app.agents.core.milestone_run.menu_clusterer.state import MenuClustererState
from langgraph.graph import END, START, StateGraph


def build_menu_clusterer_graph(client: httpx.AsyncClient):
    """Compile dedicated menu_clusterer graph."""
    builder = StateGraph(MenuClustererState)
    builder.add_node("fetch_and_prepare", partial(fetch_and_prepare, client=client))
    builder.add_node("build_clusters", build_clusters)
    builder.add_node("persist_result", partial(persist_result, client=client))
    builder.add_edge(START, "fetch_and_prepare")
    builder.add_edge("fetch_and_prepare", "build_clusters")
    builder.add_edge("build_clusters", "persist_result")
    builder.add_edge("persist_result", END)
    return builder.compile()
