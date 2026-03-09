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

_PUBLIC_HOLIDAYS_QUERY = """
query PublicHolidays($country: String!, $startDate: String!, $endDate: String!) {
  publicHolidays(country: $country, startDate: $startDate, endDate: $endDate) {
    date
    name
    localName
    holidayType
    isTentative
  }
}
"""

_OPERATING_PROFILE_QUERY = """
query OperatingProfile($locationId: ID!, $analyticsRunId: ID!) {
  operatingProfile(locationId: $locationId, analyticsRunId: $analyticsRunId) {
    totalOrders
    totalRevenue
    activeDaysCount
    avgDailyOrders
    weekdayShare
    weekendShare
    peakDay
    primaryMealPeriod
    activeMealPeriods
    operatingPattern
    diningFocus
    mealPeriodBreakdown {
      period
      label
      orderCount
      share
      revenue
      revenueShare
    }
    dayOfWeekBreakdown {
      day
      isWeekend
      orderCount
      share
      revenue
      isPeakDay
    }
    dayTypeBreakdown {
      type
      orderCount
      share
      revenue
      revenueShare
    }
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
    """Fetch public holidays for the campaign location's country from the GraphQL service."""
    planning = state.planning
    date_start = planning.dateStart if planning else None
    date_end = planning.dateEnd if planning else None

    _, country = await _fetch_location(config)

    holidays: list[NationalHoliday] | None = None
    if country and date_start and date_end:
        await _emit(
            "search_holidays", "running",
            f"Searching public holidays in {country}...",
            config,
        )
        try:
            endpoint = os.environ["GRAPHQL_ENDPOINT"]
            async with httpx.AsyncClient(timeout=10) as client:
                res = await client.post(
                    endpoint,
                    json={
                        "query": _PUBLIC_HOLIDAYS_QUERY,
                        "variables": {
                            "country": country,
                            "startDate": date_start,
                            "endDate": date_end,
                        },
                    },
                )
            res.raise_for_status()
            raw = res.json().get("data", {}).get("publicHolidays") or []
            holidays = [
                NationalHoliday(
                    localName=h["localName"],
                    name=h["name"],
                    date=h["date"],
                    type=h["holidayType"],
                )
                for h in raw
            ] or None
        except Exception:
            logger.exception("Failed to fetch public holidays for country=%s", country)

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


async def fetch_operating_profile(state: State, config: RunnableConfig) -> Dict[str, Any]:
    """Fetch the restaurant's operating profile from the GraphQL service."""
    await _emit("fetch_operating_profile", "running", "Analysing restaurant operating pattern...", config)

    planning = state.planning
    profile: dict | None = None

    configurable = config.get("configurable") or {}
    location_id = configurable.get("location_id")
    analytics_id = configurable.get("analytics_id")

    if location_id is not None and analytics_id is not None:
        try:
            endpoint = os.environ["GRAPHQL_ENDPOINT"]
            async with httpx.AsyncClient(timeout=10) as client:
                res = await client.post(
                    endpoint,
                    json={
                        "query": _OPERATING_PROFILE_QUERY,
                        "variables": {
                            "locationId": str(location_id),
                            "analyticsRunId": str(analytics_id),
                        },
                    },
                )
            res.raise_for_status()
            profile = res.json().get("data", {}).get("operatingProfile") or None
        except Exception:
            logger.exception(
                "Failed to fetch operating profile for location_id=%s analytics_id=%s",
                location_id,
                analytics_id,
            )

    label = (
        f"Operating pattern: {profile['operatingPattern']}, dining focus: {profile['diningFocus']}"
        if profile
        else "Operating profile unavailable"
    )
    await _emit("fetch_operating_profile", "done", label, config)

    updated_planning = (
        replace(planning, operatingProfile=profile)
        if planning
        else PlanningState(operatingProfile=profile)
    )
    return {"planning": updated_planning}


# ---------------------------------------------------------------------------
# Subgraph
# ---------------------------------------------------------------------------


planning_subgraph = (
    StateGraph(State)
    .add_node("generate_plan", generate_plan)
    .add_node("search_public_holidays", search_public_holidays)
    .add_node("fetch_operating_profile", fetch_operating_profile)
    .add_edge("__start__", "generate_plan")
    .add_edge("generate_plan", "search_public_holidays")
    .add_edge("search_public_holidays", "fetch_operating_profile")
    .add_edge("fetch_operating_profile", "__end__")
    .compile()
)
