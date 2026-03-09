"""Planning subgraph for the agent."""

import calendar
import os
from dataclasses import replace
from datetime import datetime
from typing import Any, Dict

import httpx
from langchain_core.callbacks.manager import adispatch_custom_event
from langchain_core.runnables import RunnableConfig
from langchain_core.tools import tool
from langchain_openai import ChatOpenAI
from langgraph.graph import StateGraph
from langgraph.prebuilt import create_react_agent
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


# ---------------------------------------------------------------------------
# Date helpers
# ---------------------------------------------------------------------------


@tool
def get_current_date() -> str:
    """Return today's date in YYYY-MM-DD format."""
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


@tool
def web_search(query: str) -> str:
    """Search the web and return a summary of results for the given query."""
    client = TavilyClient(api_key=os.environ["TAVILY_API_KEY"])
    raw = client.search(query=query, max_results=10)
    results = raw.get("results", [])
    return "\n\n".join(f"{r['title']}\n{r['content']}" for r in results)


async def _search_public_holidays(
    country: str,
    date_start: str,
    date_end: str,
) -> str | None:
    """Run a ReAct agent to find all public holidays in country within the date range."""
    llm = ChatOpenAI(model="gpt-4o-mini", temperature=0)
    agent = create_react_agent(
        model=llm,
        tools=[web_search],
        prompt=(
            "You are a public holiday research assistant. "
            "Your task is to find ALL official public (national) holidays. "
            "Run multiple targeted web searches until you are confident the list is complete. "
            "If the date range spans multiple months or years, search per year and per month as needed. "
            "Format your final answer ONLY as a newline-separated list with no extra commentary:\n"
            "  Local Name|English Name|YYYY-MM-DD\n"
            "Where 'Local Name' is the official name of the holiday in the local language of the country, "
            "'English Name' is the English translation, and 'YYYY-MM-DD' is the exact date. "
            "Only include holidays that fall within the requested date range."
        ),
    )
    try:
        result = await agent.ainvoke({
            "messages": [{
                "role": "user",
                "content": (
                    f"Find all public holidays in {country} "
                    f"from {date_start} to {date_end}."
                ),
            }]
        })
        content = result["messages"][-1].content
        if not content:
            return None
        start_dt = datetime.strptime(date_start, "%Y-%m-%d").date()
        end_dt = datetime.strptime(date_end, "%Y-%m-%d").date()
        filtered_lines = []
        for line in content.strip().splitlines():
            parts = line.split("|")
            if len(parts) < 3:
                continue
            date_str = parts[2].strip()
            try:
                entry_date = datetime.strptime(date_str, "%Y-%m-%d").date()
                if start_dt <= entry_date <= end_dt:
                    filtered_lines.append(line)
            except ValueError:
                filtered_lines.append(line)
        return "\n".join(filtered_lines) if filtered_lines else None
    except Exception:
        return None


# ---------------------------------------------------------------------------
# Graph nodes
# ---------------------------------------------------------------------------


async def generate_plan(state: State) -> Dict[str, Any]:
    """Planning node: determine campaign start and end dates for next month."""
    date_start, date_end = _compute_campaign_dates()
    return {"planning": PlanningState(dateStart=date_start, dateEnd=date_end)}


async def search_relevant_events(state: State, config: RunnableConfig) -> Dict[str, Any]:
    """Search for public holidays in the campaign location's country within the campaign timeframe."""
    planning = state.planning
    date_start = planning.dateStart if planning else None
    date_end = planning.dateEnd if planning else None

    _, country = await _fetch_location(config)

    holidays_str: str | None = None
    if country and date_start and date_end and os.environ.get("TAVILY_API_KEY"):
        await _emit(
            "search_holidays", "running",
            f"Searching public holidays in {country}...",
            config,
        )
        holidays_str = await _search_public_holidays(country, date_start, date_end)
        holiday_count = len([l for l in (holidays_str or "").splitlines() if l.strip()]) if holidays_str else 0
        await _emit(
            "search_holidays", "done",
            f"Found {holiday_count} public holiday(s) in {country}",
            config,
        )
    else:
        await _emit("search_holidays", "done", "No public holidays found", config)

    updated_planning = (
        replace(planning, nationalHolidays=holidays_str)
        if planning
        else PlanningState(nationalHolidays=holidays_str)
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
