"""Dedicated LangGraph for IG Format execution."""

from __future__ import annotations

from functools import partial

import httpx
from agents_app.agents.core.milestone_run.ig_format.nodes import (
    assign_formats_with_llm,
    fetch_and_prepare,
    persist_result,
)
from agents_app.agents.core.milestone_run.ig_format.state import IgFormatState
from langgraph.graph import END, START, StateGraph


def build_ig_format_graph(client: httpx.AsyncClient):
    """Compile dedicated IG Format graph for menu-picker-driven format assignment."""
    builder = StateGraph(IgFormatState)
    builder.add_node("fetch_and_prepare", partial(fetch_and_prepare, client=client))
    builder.add_node("assign_formats_with_llm", assign_formats_with_llm)
    builder.add_node("persist_result", partial(persist_result, client=client))
    builder.add_edge(START, "fetch_and_prepare")
    builder.add_edge("fetch_and_prepare", "assign_formats_with_llm")
    builder.add_edge("assign_formats_with_llm", "persist_result")
    builder.add_edge("persist_result", END)
    return builder.compile()
