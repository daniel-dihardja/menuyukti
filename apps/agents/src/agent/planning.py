"""Planning subgraph for the agent."""

import asyncio
import calendar
import os
from dataclasses import replace
from datetime import datetime
from typing import Any, Dict

import httpx
from langchain_core.callbacks.manager import adispatch_custom_event
from langchain_core.messages import HumanMessage
from langchain_core.runnables import RunnableConfig
from langchain_core.tools import tool
from langchain_openai import ChatOpenAI
from langgraph.graph import StateGraph
from tavily import TavilyClient

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

_date_llm = ChatOpenAI(model="gpt-4o-mini", temperature=0)


# ---------------------------------------------------------------------------
# Date helpers
# ---------------------------------------------------------------------------


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


# ---------------------------------------------------------------------------
# Private helpers
# ---------------------------------------------------------------------------


async def _emit(step: str, status: str, label: str, config: RunnableConfig) -> None:
    """Dispatch a named activity event to the LangGraph callback stream."""
    await adispatch_custom_event(
        "activity",
        {"step": step, "status": status, "label": label},
        config=config,
    )


async def _fetch_location(config: RunnableConfig) -> tuple[str | None, str | None]:
    """Fetch city and country for the configured location via GraphQL."""
    await _emit("fetch_location", "running", "Looking for location address...", config)

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

    await _emit("fetch_location", "done", "Location address found", config)
    return city, country


async def _search_scope(
    client: TavilyClient,
    scope_label: str,
    query: str,
    step_key: str,
    config: RunnableConfig,
) -> list[dict]:
    """Run a single Tavily search for one geographic scope and return normalised results."""
    await _emit(step_key, "running", f"Looking for relevant events in {scope_label}...", config)
    results: list[dict] = []
    try:
        raw = await asyncio.to_thread(client.search, query=query, max_results=5)
        for r in raw.get("results", []):
            results.append({
                "scope": scope_label,
                "title": r.get("title", ""),
                "content": r.get("content", ""),
                "url": r.get("url", ""),
            })
    except Exception:
        pass
    await _emit(step_key, "done", f"Searched events in {scope_label}", config)
    return results


async def _extract_date_hints(
    deduped: list[dict],
    date_start: str,
    date_end: str,
) -> list[str]:
    """Ask the LLM to extract a concise date hint for each event in one batch call."""
    date_hints: list[str] = [""] * len(deduped)
    if not deduped:
        return date_hints
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
            parts = line.split(".", 1)
            hint = parts[-1].strip() if len(parts) > 1 else line.strip()
            parsed_hints.append(hint)
        date_hints = (parsed_hints + [""] * len(deduped))[: len(deduped)]
    except Exception:
        pass
    return date_hints


async def _compile_events(
    all_results: list[dict],
    date_start: str | None,
    date_end: str | None,
) -> tuple[str | None, int]:
    """Deduplicate results, extract date hints, and render the pipe-delimited event string."""
    if not all_results:
        return None, 0

    seen_titles: set[str] = set()
    deduped: list[dict] = []
    for r in all_results:
        title = r["title"].strip()
        if not title or title in seen_titles:
            continue
        seen_titles.add(title)
        deduped.append(r)

    date_hints: list[str] = [""] * len(deduped)
    if date_start and date_end:
        date_hints = await _extract_date_hints(deduped, date_start, date_end)

    lines: list[str] = []
    for i, r in enumerate(deduped):
        content = r["content"].strip()
        snippet = content[:200].rstrip() + ("..." if len(content) > 200 else "")
        date_hint = date_hints[i] if i < len(date_hints) else ""
        lines.append(f"{r['title'].strip()}|{r['scope']}|{date_hint}|{snippet}")

    relevant_events = "\n".join(lines) if lines else None
    return relevant_events, len(deduped)


# ---------------------------------------------------------------------------
# Graph nodes
# ---------------------------------------------------------------------------


async def generate_plan(state: State) -> Dict[str, Any]:
    """Planning node: determine campaign start and end dates for next month."""
    date_start, date_end = _compute_campaign_dates()
    return {"planning": PlanningState(dateStart=date_start, dateEnd=date_end)}


async def search_relevant_events(state: State, config: RunnableConfig) -> Dict[str, Any]:
    """Search for relevant events in the campaign timeframe at city, country, and world level."""
    planning = state.planning
    date_start = planning.dateStart if planning else None
    date_end = planning.dateEnd if planning else None
    date_context = f" between {date_start} and {date_end}" if date_start and date_end else ""

    city, country = await _fetch_location(config)

    all_results: list[dict] = []
    tavily_api_key = os.environ.get("TAVILY_API_KEY")
    if tavily_api_key and date_start and date_end:
        client = TavilyClient(api_key=tavily_api_key)
        search_tasks = []
        if city:
            search_tasks.append(_search_scope(
                client, city,
                f"major events festivals holidays {city}{date_context}",
                "search_city", config,
            ))
        if country:
            search_tasks.append(_search_scope(
                client, country,
                f"national events public holidays sporting events {country}{date_context}",
                "search_country", config,
            ))
        search_tasks.append(_search_scope(
            client, "World",
            f"major world events global holidays sporting tournaments cultural events{date_context}",
            "search_world", config,
        ))
        gathered = await asyncio.gather(*search_tasks, return_exceptions=True)
        for chunk in gathered:
            if isinstance(chunk, list):
                all_results.extend(chunk)

    relevant_events, event_count = await _compile_events(all_results, date_start, date_end)

    if relevant_events:
        scope_label = city or country or "this region"
        await _emit("search_events_done", "done", f"Found {event_count} relevant event(s) in {scope_label}", config)
    else:
        await _emit("search_events_done", "done", "No relevant events found", config)

    updated_planning = (
        replace(planning, relevantEvents=relevant_events)
        if planning
        else PlanningState(relevantEvents=relevant_events)
    )
    return {"planning": updated_planning}


# ---------------------------------------------------------------------------
# Subgraph
# ---------------------------------------------------------------------------

planning_subgraph = (
    StateGraph(State)
    .add_node("generate_plan", generate_plan)
    .add_node("search_relevant_events", search_relevant_events)
    .add_edge("__start__", "generate_plan")
    .add_edge("generate_plan", "search_relevant_events")
    .add_edge("search_relevant_events", "__end__")
    .compile()
)
