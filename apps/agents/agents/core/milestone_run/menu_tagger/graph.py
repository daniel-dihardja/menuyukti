"""Dedicated LangGraph for menu-tagger execution."""

from __future__ import annotations

from functools import partial

import httpx
from agents_app.agents.core.milestone_run.menu_tagger.nodes import (
    fetch_and_prepare,
    persist_result,
    tag_items,
)
from agents_app.agents.core.milestone_run.menu_tagger.state import MenuTaggerState
from langgraph.graph import END, START, StateGraph


def build_menu_tagger_graph(client: httpx.AsyncClient):
    """Compile dedicated menu-tagger graph."""
    builder = StateGraph(MenuTaggerState)
    builder.add_node("fetch_and_prepare", partial(fetch_and_prepare, client=client))
    builder.add_node("tag_items", tag_items)
    builder.add_node("persist_result", partial(persist_result, client=client))
    builder.add_edge(START, "fetch_and_prepare")
    builder.add_edge("fetch_and_prepare", "tag_items")
    builder.add_edge("tag_items", "persist_result")
    builder.add_edge("persist_result", END)
    return builder.compile()
