"""Planning nodes: fetch operating profile and generate LLM location summary."""

import logging
import os
from dataclasses import replace
from typing import Any

import httpx
from langchain_core.runnables import RunnableConfig
from langchain_openai import ChatOpenAI

from agent.planning.holidays import fetch_full_location
from agent.planning.utils import _emit
from agent.state import PlanningState, State

logger = logging.getLogger(__name__)

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
    operatingSummary
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

_SAVE_OPERATING_SUMMARY_MUTATION = """
mutation SaveOperatingSummary(
  $locationId: ID!
  $analyticsRunId: ID!
  $operatingSummary: String!
  $promptVersion: String!
  $model: String!
) {
  saveOperatingSummary(
    locationId: $locationId
    analyticsRunId: $analyticsRunId
    operatingSummary: $operatingSummary
    promptVersion: $promptVersion
    model: $model
  )
}
"""

_SUMMARY_PROMPT_VERSION = "v1"

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


async def fetch_operating_profile(state: State, config: RunnableConfig) -> dict[str, Any]:
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


async def generate_location_summary(state: State, config: RunnableConfig) -> dict[str, Any]:
    """Generate a marketing-oriented semantic description of the restaurant using the LLM."""
    await _emit("generate_location_summary", "running", "Generating location profile summary...", config)

    planning = state.planning
    profile = planning.operatingProfile if planning else None
    summary: str | None = None

    if profile and profile.get("operatingSummary"):
        await _emit("generate_location_summary", "done", "Location profile summary ready (cached)", config)
        cached_summary = profile["operatingSummary"]
        updated_planning = (
            replace(planning, locationSummary=cached_summary)
            if planning
            else PlanningState(locationSummary=cached_summary)
        )
        return {"planning": updated_planning}

    if profile:
        location = await fetch_full_location(config)
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

        if summary:
            configurable = config.get("configurable") or {}
            location_id = configurable.get("location_id")
            analytics_id = configurable.get("analytics_id")
            try:
                endpoint = os.environ["GRAPHQL_ENDPOINT"]
                async with httpx.AsyncClient(timeout=10) as client:
                    await client.post(
                        endpoint,
                        json={
                            "query": _SAVE_OPERATING_SUMMARY_MUTATION,
                            "variables": {
                                "locationId": str(location_id),
                                "analyticsRunId": str(analytics_id),
                                "operatingSummary": summary,
                                "promptVersion": _SUMMARY_PROMPT_VERSION,
                                "model": _summary_llm.model_name,
                            },
                        },
                    )
            except Exception:
                logger.exception(
                    "Failed to persist operating summary for location_id=%s analytics_id=%s",
                    location_id,
                    analytics_id,
                )

    await _emit("generate_location_summary", "done", "Location profile summary ready", config)

    updated_planning = (
        replace(planning, locationSummary=summary)
        if planning
        else PlanningState(locationSummary=summary)
    )
    return {"planning": updated_planning}
