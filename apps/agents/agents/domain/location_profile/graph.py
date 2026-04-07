"""LangGraph: fetch operating profile, generate Markdown profile, persist milestonedata."""

from __future__ import annotations

import httpx
from agents_app.agents.domain.location_profile.graphql_client import (
    fetch_latest_analytics_run_id,
    fetch_operating_profile_dict,
    upsert_milestonedata,
)
from agents_app.agents.domain.location_profile.prompts import (
    LOCATION_PROFILE_SYSTEM,
    location_profile_human_message,
)
from agents_app.agents.domain.location_profile.state import LocationProfileState
from agents_app.models.llm_config import get_llm
from langchain_core.messages import HumanMessage, SystemMessage
from langgraph.config import get_stream_writer
from langgraph.graph import END, START, StateGraph


def build_location_profile_graph(client: httpx.AsyncClient):
    """Compile graph; pass a shared async HTTP client for GraphQL calls."""

    async def fetch_profile(state: LocationProfileState) -> dict[str, object]:
        writer = get_stream_writer()
        writer({"step": "fetch_profile"})
        run_id = await fetch_latest_analytics_run_id(
            state["location_id"],
            state["user_id"],
            client=client,
        )
        if not run_id:
            msg = "No analytics run found for this location. Upload sales data first."
            raise RuntimeError(msg)
        profile = await fetch_operating_profile_dict(
            state["location_id"],
            run_id,
            state["user_id"],
            client=client,
        )
        if not profile:
            msg = "Could not load operating profile for the latest analytics run."
            raise RuntimeError(msg)
        return {"profile_data": profile}

    async def generate(state: LocationProfileState) -> dict[str, object]:
        writer = get_stream_writer()
        writer({"step": "generate"})
        llm = get_llm()
        profile = state.get("profile_data") or {}
        messages = [
            SystemMessage(content=LOCATION_PROFILE_SYSTEM),
            HumanMessage(content=location_profile_human_message(profile)),
        ]
        full = ""
        async for chunk in llm.astream(messages):
            c = chunk.content
            if isinstance(c, str):
                full += c
            elif isinstance(c, list):
                full += "".join(str(x) for x in c)
        text = full.strip()
        return {"generated_text": text}

    async def persist(state: LocationProfileState) -> dict[str, object]:
        writer = get_stream_writer()
        writer({"step": "persist"})
        text = str(state.get("generated_text", "")).strip()
        if not text:
            msg = "Generated profile is empty"
            raise RuntimeError(msg)
        node = await upsert_milestonedata(
            state["milestone_id"],
            state["location_id"],
            text,
            state["user_id"],
            client=client,
        )
        nid = str(node.get("id", ""))
        return {"milestonedata_id": nid or None}

    builder = StateGraph(LocationProfileState)
    builder.add_node("fetch_profile", fetch_profile)
    builder.add_node("generate", generate)
    builder.add_node("persist", persist)
    builder.add_edge(START, "fetch_profile")
    builder.add_edge("fetch_profile", "generate")
    builder.add_edge("generate", "persist")
    builder.add_edge("persist", END)
    return builder.compile()
