"""Dedicated LangGraph for story_lineup execution."""

from __future__ import annotations

from functools import partial

import httpx
from agents_app.agents.core.milestone_run.story_lineup.nodes import (
    build_lineup,
    fetch_and_prepare,
    persist_result,
    select_public_holiday_stories,
)
from agents_app.agents.core.milestone_run.story_lineup.state import StoryLineupState
from langgraph.graph import END, START, StateGraph


def build_story_lineup_graph(client: httpx.AsyncClient):
    """Compile dedicated story_lineup graph."""
    builder = StateGraph(StoryLineupState)
    builder.add_node("fetch_and_prepare", partial(fetch_and_prepare, client=client))
    builder.add_node("select_public_holiday_stories", select_public_holiday_stories)
    builder.add_node("build_lineup", build_lineup)
    builder.add_node("persist_result", partial(persist_result, client=client))
    builder.add_edge(START, "fetch_and_prepare")
    builder.add_edge("fetch_and_prepare", "select_public_holiday_stories")
    builder.add_edge("select_public_holiday_stories", "build_lineup")
    builder.add_edge("build_lineup", "persist_result")
    builder.add_edge("persist_result", END)
    return builder.compile()
