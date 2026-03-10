"""Planning nodes: fetch operating profile and generate LLM location summary."""

import asyncio
import logging
from typing import Any

from langchain_core.runnables import RunnableConfig
from langchain_openai import ChatOpenAI

from agent.planning.utils import _emit, _gql, _update_planning
from agent.state import State

logger = logging.getLogger(__name__)


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


async def _persist_summary(
    location_id: Any,
    analytics_id: Any,
    summary: str,
    model_name: str,
) -> None:
    """Persist the generated operating summary to the database (fire-and-forget)."""
    try:
        await _gql(
            _SAVE_OPERATING_SUMMARY_MUTATION,
            {
                "locationId": str(location_id),
                "analyticsRunId": str(analytics_id),
                "operatingSummary": summary,
                "promptVersion": _SUMMARY_PROMPT_VERSION,
                "model": model_name,
            },
        )
    except Exception:
        logger.exception(
            "Failed to persist operating summary for location_id=%s analytics_id=%s",
            location_id,
            analytics_id,
        )


async def generate_location_summary(state: State, config: RunnableConfig) -> dict[str, Any]:
    """Generate a marketing-oriented semantic description of the restaurant using the LLM."""
    await _emit("generate_location_summary", "running", "Generating location profile summary...", config)

    planning = state.planning
    profile = planning.operatingProfile if planning else None
    summary: str | None = None

    if profile and profile.get("operatingSummary"):
        await _emit("generate_location_summary", "done", "Location profile summary ready (cached)", config)
        return {"planning": _update_planning(planning, locationSummary=profile["operatingSummary"])}

    if profile:
        location = (planning.location if planning else None) or {}
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
            asyncio.create_task(
                _persist_summary(location_id, analytics_id, summary, _summary_llm.model_name)
            )

    await _emit("generate_location_summary", "done", "Location profile summary ready", config)
    return {"planning": _update_planning(planning, locationSummary=summary)}
