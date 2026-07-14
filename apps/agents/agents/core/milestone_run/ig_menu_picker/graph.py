"""Dedicated LangGraph for IG Menu Picker execution."""

from __future__ import annotations

from functools import partial

import httpx
from agents_app.agents.core.milestone_run.ig_menu_picker.nodes import (
    fetch_and_prepare,
    persist_result,
    pick_menu_items_with_llm,
)
from agents_app.agents.core.milestone_run.ig_menu_picker.state import IgMenuPickerState
from langgraph.graph import END, START, StateGraph


def build_ig_menu_picker_graph(client: httpx.AsyncClient):
    """Compile dedicated IG Menu Picker graph for plan-driven menu selection."""
    builder = StateGraph(IgMenuPickerState)
    builder.add_node("fetch_and_prepare", partial(fetch_and_prepare, client=client))
    builder.add_node("pick_menu_items_with_llm", pick_menu_items_with_llm)
    builder.add_node("persist_result", partial(persist_result, client=client))
    builder.add_edge(START, "fetch_and_prepare")
    builder.add_edge("fetch_and_prepare", "pick_menu_items_with_llm")
    builder.add_edge("pick_menu_items_with_llm", "persist_result")
    builder.add_edge("persist_result", END)
    return builder.compile()
