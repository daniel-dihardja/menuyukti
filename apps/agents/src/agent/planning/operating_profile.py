"""Planning nodes: fetch operating profile and generate LLM location summary."""

import logging
from typing import Any

from langchain_core.runnables import RunnableConfig
from langchain_openai import ChatOpenAI

from agent.planning.utils import _emit, _update_planning
from agent.state import State

logger = logging.getLogger(__name__)


_LOCATION_SUMMARY_PROMPT = """You are a marketing analyst helping a restaurant build an Instagram content strategy.

Based on the following restaurant data, write a concise 2–3 sentence profile that gives a restaurant marketer a clear, actionable picture of the venue. Every data point below must be reflected in the profile — keep it short, but leave nothing out. Cover:
- Dining experience: meal focus, operating pattern, busiest time windows
- Customer mix: average items per order (proxy for party size — lower = more solo/pair, higher = more groups/families) and average spend per order (price-point signal)
- Customer activity patterns: peak day, primary meal period, day-of-week and meal-period distribution
- Revenue concentration: which days and meal periods drive the most revenue (use peak revenue day/period, not just order volume)
- Any notable weekday/weekend/holiday split that should influence content scheduling
- Menu composition: dominant food/drink split and top sub-categories

Keep the tone professional but approachable. Do not invent facts — only use the data provided.

Restaurant name: {name}
Location: {city}, {country}

Operating profile:
- Total orders: {total_orders}
- Total revenue: {total_revenue}
- Active days: {active_days_count}
- Average active days per week: {avg_active_days_per_week:.1f}
- Average daily orders: {avg_daily_orders:.1f}
- Average items per order: {avg_order_size:.1f} (proxy for party size)
- Average revenue per order: {avg_revenue_per_order:.2f}
- Weekday share: {weekday_share:.0%} | Weekend share: {weekend_share:.0%} | Holiday share: {holiday_share:.0%}
- Peak day (by orders): {peak_day} | Peak day (by revenue): {peak_revenue_day}
- Primary meal period (by orders): {primary_meal_period} | Peak meal period (by revenue): {peak_revenue_meal_period}
- Active meal periods: {active_meal_periods}
- Operating pattern: {operating_pattern}
- Dining focus: {dining_focus}
- Menu composition: {menu_category_summary}

Meal period breakdown:
{meal_period_breakdown}

Day-of-week breakdown:
{day_of_week_breakdown}

Day-type breakdown (weekday / weekend / holiday):
{day_type_breakdown}

Menu category breakdown (FOOD / DRINK):
{menu_category_breakdown}

Menu sub-category breakdown:
{menu_category_detail_breakdown}"""

_summary_llm = ChatOpenAI(model="gpt-4o-mini", temperature=0.4)


async def generate_location_summary(state: State, config: RunnableConfig) -> dict[str, Any]:
    """Generate a marketing-oriented semantic description of the restaurant using the LLM."""
    await _emit("generate_location_summary", "running", "Generating location profile summary...", config)

    planning = state.planning
    profile = planning.operatingProfile if planning else None
    summary: str | None = None

    if profile:
        location = (planning.location if planning else None) or {}
        name = location.get("name") or "this restaurant"
        city = location.get("city") or "unknown city"
        country = location.get("country") or "unknown country"

        # Use `or 0` / `or "N/A"` guards so that GQL null values don't produce
        # None arguments into format specifiers like :.1f or :.0%, which would
        # raise a TypeError and silently swallow the whole summary generation.
        meal_period_lines = [
            f"  {p.get('label') or p.get('period', '?')}: "
            f"{p.get('share') or 0:.0%} of orders, {p.get('revenueShare') or 0:.0%} of revenue, "
            f"avg ticket {p.get('avgRevenuePerOrder') or 0:.2f}"
            for p in (profile.get("mealPeriodBreakdown") or [])
        ]
        dow_lines = [
            f"  {d.get('day', '?')}: {d.get('share') or 0:.0%} of orders, "
            f"{d.get('revenueShare') or 0:.0%} of revenue"
            + (", peak day" if d.get("isPeakDay") else "")
            for d in (profile.get("dayOfWeekBreakdown") or [])
        ]
        day_type_lines = [
            f"  {t.get('type', '?')}: {t.get('share') or 0:.0%} of orders, {t.get('revenueShare') or 0:.0%} of revenue"
            for t in (profile.get("dayTypeBreakdown") or [])
        ]
        category_lines = [
            f"  {c.get('category', '?')}: {c.get('quantityShare') or 0:.0%} of orders, {c.get('revenueShare') or 0:.0%} of revenue"
            for c in (profile.get("menuCategoryBreakdown") or [])
        ]
        detail_lines = [
            f"  {d.get('detail', '?')} ({d.get('menuCategory', '?')}): {d.get('quantityShare') or 0:.0%} of orders, {d.get('revenueShare') or 0:.0%} of revenue"
            for d in (profile.get("menuCategoryDetailBreakdown") or [])
        ]

        _cat_breakdown = profile.get("menuCategoryBreakdown") or []
        _top_cat = _cat_breakdown[0].get("category") if _cat_breakdown else None
        _top_cat_share = (_cat_breakdown[0].get("quantityShare") or 0) if _cat_breakdown else 0
        _detail_breakdown = profile.get("menuCategoryDetailBreakdown") or []
        _top_detail = _detail_breakdown[0].get("detail") if _detail_breakdown else None
        if _top_cat:
            menu_category_summary = f"{_top_cat_share:.0%} {_top_cat}-led" + (
                f", top sub-category: {_top_detail}" if _top_detail else ""
            )
        else:
            menu_category_summary = "N/A"

        prompt = _LOCATION_SUMMARY_PROMPT.format(
            name=name,
            city=city,
            country=country,
            total_orders=profile.get("totalOrders") or "N/A",
            total_revenue=profile.get("totalRevenue") or 0,
            active_days_count=profile.get("activeDaysCount") or "N/A",
            avg_active_days_per_week=profile.get("avgActiveDaysPerWeek") or 0,
            avg_daily_orders=profile.get("avgDailyOrders") or 0,
            avg_order_size=profile.get("avgOrderSize") or 0,
            avg_revenue_per_order=profile.get("avgRevenuePerOrder") or 0,
            weekday_share=profile.get("weekdayShare") or 0,
            weekend_share=profile.get("weekendShare") or 0,
            holiday_share=profile.get("holidayShare") or 0,
            peak_day=profile.get("peakDay") or "N/A",
            peak_revenue_day=profile.get("peakRevenueDay") or "N/A",
            primary_meal_period=profile.get("primaryMealPeriod") or "N/A",
            peak_revenue_meal_period=profile.get("peakRevenueMealPeriod") or "N/A",
            active_meal_periods=", ".join(profile.get("activeMealPeriods") or []) or "N/A",
            operating_pattern=profile.get("operatingPattern") or "N/A",
            dining_focus=profile.get("diningFocus") or "N/A",
            menu_category_summary=menu_category_summary,
            meal_period_breakdown="\n".join(meal_period_lines) or "  N/A",
            day_of_week_breakdown="\n".join(dow_lines) or "  N/A",
            day_type_breakdown="\n".join(day_type_lines) or "  N/A",
            menu_category_breakdown="\n".join(category_lines) or "  N/A",
            menu_category_detail_breakdown="\n".join(detail_lines) or "  N/A",
        )

        try:
            result = await _summary_llm.ainvoke(prompt)
            summary = result.content if hasattr(result, "content") else str(result)
        except Exception:
            logger.exception("Failed to generate location summary")

    await _emit("generate_location_summary", "done", "Location profile summary ready", config)
    return {"planning": _update_planning(planning, locationSummary=summary)}
