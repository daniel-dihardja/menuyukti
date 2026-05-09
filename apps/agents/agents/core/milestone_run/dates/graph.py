"""Dedicated LangGraph for deterministic dates execution."""

from __future__ import annotations

from functools import partial

import httpx
from agents_app.agents.core.milestone_run.dates.nodes import fetch_dates_context, persist_result
from agents_app.agents.core.milestone_run.dates.state import DatesState
from langgraph.graph import END, START, StateGraph


def build_dates_graph(client: httpx.AsyncClient):
    """Compile dedicated dates graph for date-window holiday resolution."""
    builder = StateGraph(DatesState)
    builder.add_node("fetch_dates_context", partial(fetch_dates_context, client=client))
    builder.add_node("persist_result", partial(persist_result, client=client))
    builder.add_edge(START, "fetch_dates_context")
    builder.add_edge("fetch_dates_context", "persist_result")
    builder.add_edge("persist_result", END)
    return builder.compile()
