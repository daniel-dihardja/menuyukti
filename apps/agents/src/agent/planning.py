"""Planning subgraph for the agent."""

import asyncio
import calendar
import os
from dataclasses import replace
from datetime import datetime
from typing import Any, Dict

import httpx
from langchain_core.messages import HumanMessage
from langchain_core.runnables import RunnableConfig
from langchain_core.tools import tool
from langchain_openai import ChatOpenAI
from langgraph.graph import StateGraph
from tavily import TavilyClient

_date_llm = ChatOpenAI(model="gpt-4o-mini", temperature=0)

from agent.state import PlanningState, State

_LOCATION_QUERY = """
query Location($id: ID!) {
  location(id: $id) {
    id
    name
    street
    city
    country
  }
}
"""


@tool
def get_current_date() -> str:
    """Returns today's date in YYYY-MM-DD format."""
    return datetime.now().strftime("%Y-%m-%d")


def _compute_campaign_dates() -> tuple[str, str]:
    """Return (dateStart, dateEnd) for the next calendar month."""
    today = datetime.strptime(get_current_date.invoke({}), "%Y-%m-%d")
    year, month = today.year, today.month + 1
    if month > 12:
        month = 1
        year += 1
    last_day = calendar.monthrange(year, month)[1]
    date_start = datetime(year, month, 1).strftime("%Y-%m-%d")
    date_end = datetime(year, month, last_day).strftime("%Y-%m-%d")
    return date_start, date_end


async def generate_plan(state: State) -> Dict[str, Any]:
    """Planning node: determine campaign start and end dates for next month."""
    date_start, date_end = _compute_campaign_dates()
    return {"planning": PlanningState(dateStart=date_start, dateEnd=date_end)}


async def search_relevant_events(state: State, config: RunnableConfig) -> Dict[str, Any]:
    """Search for relevant events in the campaign timeframe at city, country, and world level."""
    from langchain_core.callbacks.manager import adispatch_custom_event

    planning = state.planning
    date_start = planning.dateStart if planning else None
    date_end = planning.dateEnd if planning else None

    # Step 1: fetch location
    await adispatch_custom_event(
        "activity",
        {"step": "fetch_location", "status": "running", "label": "Looking for location address..."},
        config=config,
    )

    city: str | None = None
    country: str | None = None

    location_id = (config.get("configurable") or {}).get("location_id")
    if location_id is not None:
        try:
            endpoint = os.environ["GRAPHQL_ENDPOINT"]
            async with httpx.AsyncClient(timeout=10) as client:
                res = await client.post(
                    endpoint,
                    json={"query": _LOCATION_QUERY, "variables": {"id": str(location_id)}},
                )
            res.raise_for_status()
            loc = res.json().get("data", {}).get("location") or {}
            city = loc.get("city")
            country = loc.get("country")
        except Exception:
            pass

    await adispatch_custom_event(
        "activity",
        {"step": "fetch_location", "status": "done", "label": "Location address found"},
        config=config,
    )

    tavily_api_key = os.environ.get("TAVILY_API_KEY")
    all_results: list[dict] = []

    date_context = ""
    if date_start and date_end:
        date_context = f" between {date_start} and {date_end}"

    if tavily_api_key and date_start and date_end:
        client = TavilyClient(api_key=tavily_api_key)

        # Step 2: search city events
        if city:
            await adispatch_custom_event(
                "activity",
                {"step": "search_city", "status": "running", "label": f"Looking for relevant events in {city}..."},
                config=config,
            )
            try:
                city_results = await asyncio.to_thread(
                    client.search,
                    query=f"major events festivals holidays {city}{date_context}",
                    max_results=5,
                )
                for r in city_results.get("results", []):
                    all_results.append({"scope": city, "title": r.get("title", ""), "content": r.get("content", ""), "url": r.get("url", "")})
            except Exception:
                pass
            await adispatch_custom_event(
                "activity",
                {"step": "search_city", "status": "done", "label": f"Searched events in {city}"},
                config=config,
            )

        # Step 3: search country events
        if country:
            await adispatch_custom_event(
                "activity",
                {"step": "search_country", "status": "running", "label": f"Looking for relevant events in {country}..."},
                config=config,
            )
            try:
                country_results = await asyncio.to_thread(
                    client.search,
                    query=f"national events public holidays sporting events {country}{date_context}",
                    max_results=5,
                )
                for r in country_results.get("results", []):
                    all_results.append({"scope": country, "title": r.get("title", ""), "content": r.get("content", ""), "url": r.get("url", "")})
            except Exception:
                pass
            await adispatch_custom_event(
                "activity",
                {"step": "search_country", "status": "done", "label": f"Searched events in {country}"},
                config=config,
            )

        # Step 4: search world events
        await adispatch_custom_event(
            "activity",
            {"step": "search_world", "status": "running", "label": "Looking for relevant events in the world..."},
            config=config,
        )
        try:
            world_results = await asyncio.to_thread(
                client.search,
                query=f"major world events global holidays sporting tournaments cultural events{date_context}",
                max_results=5,
            )
            for r in world_results.get("results", []):
                all_results.append({"scope": "World", "title": r.get("title", ""), "content": r.get("content", ""), "url": r.get("url", "")})
        except Exception:
            pass
        await adispatch_custom_event(
            "activity",
            {"step": "search_world", "status": "done", "label": "Searched world events"},
            config=config,
        )

    # Step 5: compile results
    relevant_events: str | None = None
    deduped: list[dict] = []
    if all_results:
        # Deduplicate by title first
        deduped: list[dict] = []
        seen_titles: set[str] = set()
        for r in all_results:
            title = r["title"].strip()
            if not title or title in seen_titles:
                continue
            seen_titles.add(title)
            deduped.append(r)

        # Step 5.5: extract date hints via LLM (single batch call)
        date_hints: list[str] = [""] * len(deduped)
        if deduped and date_start and date_end:
            try:
                items_text = "\n".join(
                    f"{i + 1}. Title: {r['title']}\nContent: {r['content'][:300]}"
                    for i, r in enumerate(deduped)
                )
                prompt = (
                    f"Campaign period: {date_start} to {date_end}.\n\n"
                    f"For each event below extract the most specific date hint you can.\n"
                    f"Rules:\n"
                    f"- Use DD.MM for exact dates (e.g. 31.12)\n"
                    f"- Use month name for month-only (e.g. Late April)\n"
                    f"- Use a short range for multi-day events (e.g. Apr 1-7)\n"
                    f"- Return an empty string if nothing identifiable\n"
                    f"Reply ONLY with a numbered list matching the input order, one date hint per line "
                    f"(e.g. '1. 31.12'). Do not include any other text.\n\n"
                    f"{items_text}"
                )
                response = await _date_llm.ainvoke([HumanMessage(content=prompt)])
                raw_lines = response.content.strip().split("\n")
                parsed_hints: list[str] = []
                for line in raw_lines:
                    # Strip leading "N. " numbering
                    parts = line.split(".", 1)
                    hint = parts[-1].strip() if len(parts) > 1 else line.strip()
                    parsed_hints.append(hint)
                # Align hints to deduped list length (LLM may return fewer lines)
                date_hints = (parsed_hints + [""] * len(deduped))[: len(deduped)]
            except Exception:
                pass

        lines: list[str] = []
        for i, r in enumerate(deduped):
            scope = r["scope"]
            content = r["content"].strip()
            snippet = content[:200].rstrip() + ("..." if len(content) > 200 else "")
            date_hint = date_hints[i] if i < len(date_hints) else ""
            lines.append(f"{r['title'].strip()}|{scope}|{date_hint}|{snippet}")
        if lines:
            relevant_events = "\n".join(lines)

    event_count = len(deduped) if all_results else 0
    if relevant_events:
        scope_label = city or country or "this region"
        await adispatch_custom_event(
            "activity",
            {"step": "search_events_done", "status": "done", "label": f"Found {event_count} relevant event(s) in {scope_label}"},
            config=config,
        )
    else:
        await adispatch_custom_event(
            "activity",
            {"step": "search_events_done", "status": "done", "label": "No relevant events found"},
            config=config,
        )

    updated_planning = replace(planning, relevantEvents=relevant_events) if planning else PlanningState(relevantEvents=relevant_events)
    return {"planning": updated_planning}


planning_subgraph = (
    StateGraph(State)
    .add_node("generate_plan", generate_plan)
    .add_node("search_relevant_events", search_relevant_events)
    .add_edge("__start__", "generate_plan")
    .add_edge("generate_plan", "search_relevant_events")
    .add_edge("search_relevant_events", "__end__")
    .compile()
)
