"""Dedicated LangGraph for IG Text execution."""

from __future__ import annotations

from functools import partial

import httpx
from agents_app.agents.core.milestone_run.ig_text.nodes import (
    fetch_and_prepare,
    generate_texts_with_llm,
    persist_result,
)
from agents_app.agents.core.milestone_run.ig_text.state import IgTextState
from langgraph.graph import END, START, StateGraph


def build_ig_text_graph(client: httpx.AsyncClient):
    """Compile dedicated IG Text graph for format-driven copy generation."""
    builder = StateGraph(IgTextState)
    builder.add_node("fetch_and_prepare", partial(fetch_and_prepare, client=client))
    builder.add_node("generate_texts_with_llm", generate_texts_with_llm)
    builder.add_node("persist_result", partial(persist_result, client=client))
    builder.add_edge(START, "fetch_and_prepare")
    builder.add_edge("fetch_and_prepare", "generate_texts_with_llm")
    builder.add_edge("generate_texts_with_llm", "persist_result")
    builder.add_edge("persist_result", END)
    return builder.compile()
