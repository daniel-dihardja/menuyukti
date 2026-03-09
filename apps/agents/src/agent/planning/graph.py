"""LangGraph nodes and subgraph assembly for the planning workflow."""

import logging
import os
from dataclasses import replace
from typing import Any, Dict

import httpx
from langchain_core.callbacks.manager import adispatch_custom_event
from langchain_core.runnables import RunnableConfig
from langgraph.graph import StateGraph

from agent.planning.dates import _compute_campaign_dates
from agent.planning.holidays import search_public_holidays
from agent.state import NationalHoliday, PlanningState, State

logger = logging.getLogger(__name__)

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
# Shared helpers
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
            logger.exception("Failed to fetch location for id=%s", location_id)

    await _emit("fetch_location", "done", "Location address found", config)
    return city, country


# ---------------------------------------------------------------------------
# Graph nodes
# ---------------------------------------------------------------------------


async def generate_plan(state: State) -> Dict[str, Any]:
    """Planning node: determine campaign start and end dates for next month."""
    date_start, date_end = _compute_campaign_dates()
    return {"planning": PlanningState(dateStart=date_start, dateEnd=date_end)}


async def search_public_holidays(state: State, config: RunnableConfig) -> Dict[str, Any]:
    """Search for public holidays in the campaign location's country within the campaign timeframe."""
    planning = state.planning
    date_start = planning.dateStart if planning else None
    date_end = planning.dateEnd if planning else None

    _, country = await _fetch_location(config)

    holidays: list[NationalHoliday] | None = None
    if country and date_start and date_end and os.environ.get("TAVILY_API_KEY"):
        await _emit(
            "search_holidays", "running",
            f"Searching public holidays in {country}...",
            config,
        )
        holidays = await search_public_holidays(country, date_start, date_end)
        holiday_count = len(holidays) if holidays else 0
        await _emit(
            "search_holidays", "done",
            f"Found {holiday_count} public holiday(s) in {country}",
            config,
        )
    else:
        await _emit("search_holidays", "done", "No public holidays found", config)

    updated_planning = (
        replace(planning, nationalHolidays=holidays)
        if planning
        else PlanningState(nationalHolidays=holidays)
    )
    return {"planning": updated_planning}


# ---------------------------------------------------------------------------
# Subgraph
# ---------------------------------------------------------------------------

planning_subgraph = (
    StateGraph(State)
    .add_node("generate_plan", generate_plan)
    .add_node("search_public_holidays", search_public_holidays)
    .add_edge("__start__", "generate_plan")
    .add_edge("generate_plan", "search_public_holidays")
    .add_edge("search_public_holidays", "__end__")
    .compile()
)
