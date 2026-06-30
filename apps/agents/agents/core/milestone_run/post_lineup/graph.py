"""Dedicated LangGraph for post_lineup execution."""

from __future__ import annotations

from functools import partial

import httpx
from agents_app.agents.core.milestone_run.post_lineup.nodes import (
    fetch_and_prepare,
    finalize_output,
    generate_top_five_posts,
    persist_result,
)
from agents_app.agents.core.milestone_run.post_lineup.state import PostLineupState
from langgraph.graph import END, START, StateGraph


def build_post_lineup_graph(client: httpx.AsyncClient):
    """Compile dedicated post_lineup graph."""
    builder = StateGraph(PostLineupState)
    builder.add_node("fetch_and_prepare", partial(fetch_and_prepare, client=client))
    builder.add_node("generate_top_five_posts", generate_top_five_posts)
    builder.add_node("finalize_output", finalize_output)
    builder.add_node("persist_result", partial(persist_result, client=client))
    builder.add_edge(START, "fetch_and_prepare")
    builder.add_edge("fetch_and_prepare", "generate_top_five_posts")
    builder.add_edge("generate_top_five_posts", "finalize_output")
    builder.add_edge("finalize_output", "persist_result")
    builder.add_edge("persist_result", END)
    return builder.compile()
