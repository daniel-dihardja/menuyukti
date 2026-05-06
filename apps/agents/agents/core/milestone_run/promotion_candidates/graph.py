"""Dedicated LangGraph for deterministic promotion-candidates execution."""

from __future__ import annotations

from functools import partial

import httpx
from agents_app.agents.core.milestone_run.promotion_candidates.nodes import (
    fetch_and_prepare,
    generate_draft,
    persist_result,
)
from agents_app.agents.core.milestone_run.promotion_candidates.state import (
    PromotionCandidatesState,
)
from langgraph.graph import END, START, StateGraph


def build_promotion_candidates_graph(client: httpx.AsyncClient):
    """Compile dedicated promotion-candidates graph with deterministic prep + structured generation."""
    builder = StateGraph(PromotionCandidatesState)
    builder.add_node("fetch_and_prepare", partial(fetch_and_prepare, client=client))
    builder.add_node("generate_draft", generate_draft)
    builder.add_node("persist_result", partial(persist_result, client=client))
    builder.add_edge(START, "fetch_and_prepare")
    builder.add_edge("fetch_and_prepare", "generate_draft")
    builder.add_edge("generate_draft", "persist_result")
    builder.add_edge("persist_result", END)
    return builder.compile()
