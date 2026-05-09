"""Dedicated LangGraph for format-mix: fetch campaign brief from priors, persist stub (no LLM)."""

from __future__ import annotations

from functools import partial

import httpx
from agents_app.agents.core.milestone_run.format_mix.nodes import (
    fetch_campaign_brief_context,
    persist_stub,
)
from agents_app.agents.core.milestone_run.format_mix.state import FormatMixState
from langgraph.graph import END, START, StateGraph


def build_format_mix_graph(client: httpx.AsyncClient):
    """Compile dedicated format-mix graph."""
    builder = StateGraph(FormatMixState)
    builder.add_node("fetch_campaign_brief_context", partial(fetch_campaign_brief_context, client=client))
    builder.add_node("persist_stub", partial(persist_stub, client=client))
    builder.add_edge(START, "fetch_campaign_brief_context")
    builder.add_edge("fetch_campaign_brief_context", "persist_stub")
    builder.add_edge("persist_stub", END)
    return builder.compile()
