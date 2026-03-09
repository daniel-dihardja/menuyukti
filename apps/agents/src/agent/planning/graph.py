"""LangGraph nodes and subgraph assembly for the planning workflow."""

import logging
import os
from dataclasses import replace
from typing import Any, Dict

import httpx
from langchain_core.callbacks.manager import adispatch_custom_event
from langchain_core.runnables import RunnableConfig
from langchain_openai import ChatOpenAI
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


_LOCATION_SUMMARY_PROMPT = """You are a marketing analyst helping a restaurant build an Instagram content strategy.

Based on the following restaurant data, write a concise 2–3 sentence profile that gives a restaurant marketer a clear, actionable picture of the venue. Every data point below must be reflected in the profile — keep it short, but leave nothing out. Cover:
- Dining experience: meal focus, operating pattern, busiest time windows
- Customer activity patterns: peak day, primary meal period, day-of-week and meal-period distribution
- Revenue concentration: which days and meal periods drive the most revenue
- Any notable weekday/weekend/holiday split that should influence content scheduling

Keep the tone professional but approachable. Do not invent facts — only use the data provided.

Restaurant name: {name}
Location: {city}, {country}

Operating profile:
- Total orders: {total_orders}
- Total revenue: {total_revenue}
- Active days: {active_days_count}
- Average daily orders: {avg_daily_orders:.1f}
- Weekday share: {weekday_share:.0%} | Weekend share: {weekend_share:.0%}
- Peak day: {peak_day}
- Primary meal period: {primary_meal_period}
- Active meal periods: {active_meal_periods}
- Operating pattern: {operating_pattern}
- Dining focus: {dining_focus}

Meal period breakdown:
{meal_period_breakdown}

Day-of-week breakdown:
{day_of_week_breakdown}

Day-type breakdown (weekday / weekend / holiday):
{day_type_breakdown}"""

_summary_llm = ChatOpenAI(model="gpt-4o-mini", temperature=0.4)


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


async def _fetch_full_location(config: RunnableConfig) -> dict[str, Any]:
    """Fetch full location record (name, street, city, country) via GraphQL."""
    location_id = (config.get("configurable") or {}).get("location_id")
    if location_id is None:
        return {}
    try:
        endpoint = os.environ["GRAPHQL_ENDPOINT"]
        async with httpx.AsyncClient(timeout=10) as client:
            res = await client.post(
                endpoint,
                json={"query": _LOCATION_QUERY, "variables": {"id": str(location_id)}},
            )
        res.raise_for_status()
        return res.json().get("data", {}).get("location") or {}
    except Exception:
        logger.exception("Failed to fetch full location for id=%s", location_id)
        return {}


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


async def generate_location_summary(state: State, config: RunnableConfig) -> Dict[str, Any]:
    """Generate a marketing-oriented semantic description of the restaurant using the LLM."""
    await _emit("generate_location_summary", "running", "Generating location profile summary...", config)

    planning = state.planning
    profile = planning.operatingProfile if planning else None
    summary: str | None = None

    if profile:
        location = await _fetch_full_location(config)
        name = location.get("name") or "this restaurant"
        city = location.get("city") or "unknown city"
        country = location.get("country") or "unknown country"

        meal_period_lines = [
            f"  {p.get('label') or p.get('period', '?')}: "
            f"{p.get('share', 0):.0%} of orders, {p.get('revenueShare', 0):.0%} of revenue"
            for p in (profile.get("mealPeriodBreakdown") or [])
        ]
        dow_lines = [
            f"  {d.get('day', '?')}: {d.get('share', 0):.0%} of orders"
            + (", peak day" if d.get("isPeakDay") else "")
            for d in (profile.get("dayOfWeekBreakdown") or [])
        ]
        day_type_lines = [
            f"  {t.get('type', '?')}: {t.get('share', 0):.0%} of orders, {t.get('revenueShare', 0):.0%} of revenue"
            for t in (profile.get("dayTypeBreakdown") or [])
        ]

        prompt = _LOCATION_SUMMARY_PROMPT.format(
            name=name,
            city=city,
            country=country,
            total_orders=profile.get("totalOrders", "N/A"),
            total_revenue=profile.get("totalRevenue", 0),
            active_days_count=profile.get("activeDaysCount", "N/A"),
            avg_daily_orders=profile.get("avgDailyOrders", 0),
            weekday_share=profile.get("weekdayShare", 0),
            weekend_share=profile.get("weekendShare", 0),
            peak_day=profile.get("peakDay", "N/A"),
            primary_meal_period=profile.get("primaryMealPeriod", "N/A"),
            active_meal_periods=", ".join(profile.get("activeMealPeriods") or []) or "N/A",
            operating_pattern=profile.get("operatingPattern", "N/A"),
            dining_focus=profile.get("diningFocus", "N/A"),
            meal_period_breakdown="\n".join(meal_period_lines) or "  N/A",
            day_of_week_breakdown="\n".join(dow_lines) or "  N/A",
            day_type_breakdown="\n".join(day_type_lines) or "  N/A",
        )

        try:
            result = await _summary_llm.ainvoke(prompt)
            summary = result.content if hasattr(result, "content") else str(result)
        except Exception:
            logger.exception("Failed to generate location summary")

    await _emit("generate_location_summary", "done", "Location profile summary ready", config)

    updated_planning = (
        replace(planning, locationSummary=summary)
        if planning
        else PlanningState(locationSummary=summary)
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
    .add_node("generate_location_summary", generate_location_summary)
    .add_edge("__start__", "generate_plan")
    .add_edge("generate_plan", "search_public_holidays")
    .add_edge("search_public_holidays", "fetch_operating_profile")
    .add_edge("fetch_operating_profile", "generate_location_summary")
    .add_edge("generate_location_summary", "__end__")
    .compile()
)
