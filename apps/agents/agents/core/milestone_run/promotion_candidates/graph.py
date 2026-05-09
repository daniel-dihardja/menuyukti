"""Dedicated LangGraph for deterministic promotion-candidates execution."""

from __future__ import annotations

from functools import partial

import httpx
from agents_app.agents.core.milestone_run.promotion_candidates.nodes import (
    enrich_storytelling,
    fetch_and_prepare,
    persist_result,
)
from agents_app.agents.core.milestone_run.promotion_candidates.state import (
    PromotionCandidatesState,
)
from langgraph.graph import END, START, StateGraph


def build_promotion_candidates_graph(client: httpx.AsyncClient):
    """Compile promotion-candidates graph: fetch, storytelling LLM enrichment, persist."""
    builder = StateGraph(PromotionCandidatesState)
    builder.add_node("fetch_and_prepare", partial(fetch_and_prepare, client=client))
    builder.add_node("enrich_storytelling", enrich_storytelling)
    builder.add_node("persist_result", partial(persist_result, client=client))
    builder.add_edge(START, "fetch_and_prepare")
    builder.add_edge("fetch_and_prepare", "enrich_storytelling")
    builder.add_edge("enrich_storytelling", "persist_result")
    builder.add_edge("persist_result", END)
    return builder.compile()
