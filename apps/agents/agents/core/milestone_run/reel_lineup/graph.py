"""Dedicated LangGraph for reel_lineup execution."""

from __future__ import annotations

from functools import partial

import httpx
from agents_app.agents.core.milestone_run.reel_lineup.nodes import (
    build_lineup,
    fetch_and_prepare,
    persist_result,
)
from agents_app.agents.core.milestone_run.reel_lineup.state import ReelLineupState
from langgraph.graph import END, START, StateGraph


def build_reel_lineup_graph(client: httpx.AsyncClient):
    """Compile dedicated reel_lineup graph."""
    builder = StateGraph(ReelLineupState)
    builder.add_node("fetch_and_prepare", partial(fetch_and_prepare, client=client))
    builder.add_node("build_lineup", build_lineup)
    builder.add_node("persist_result", partial(persist_result, client=client))
    builder.add_edge(START, "fetch_and_prepare")
    builder.add_edge("fetch_and_prepare", "build_lineup")
    builder.add_edge("build_lineup", "persist_result")
    builder.add_edge("persist_result", END)
    return builder.compile()
