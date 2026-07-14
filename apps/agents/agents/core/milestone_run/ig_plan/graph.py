"""Dedicated LangGraph for IGPlan execution."""

from __future__ import annotations

from functools import partial

import httpx
from agents_app.agents.core.milestone_run.ig_plan.nodes import (
    fetch_and_prepare,
    generate_plan_with_llm,
    persist_result,
)
from agents_app.agents.core.milestone_run.ig_plan.state import IgPlanState
from langgraph.graph import END, START, StateGraph


def build_ig_plan_graph(client: httpx.AsyncClient):
    """Compile dedicated IGPlan graph for analytics-driven weekly scheduling."""
    builder = StateGraph(IgPlanState)
    builder.add_node("fetch_and_prepare", partial(fetch_and_prepare, client=client))
    builder.add_node("generate_plan_with_llm", generate_plan_with_llm)
    builder.add_node("persist_result", partial(persist_result, client=client))
    builder.add_edge(START, "fetch_and_prepare")
    builder.add_edge("fetch_and_prepare", "generate_plan_with_llm")
    builder.add_edge("generate_plan_with_llm", "persist_result")
    builder.add_edge("persist_result", END)
    return builder.compile()
