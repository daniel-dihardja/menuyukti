"""Planning node: synthesise all context into a structured campaign brief."""

import json
import logging
from dataclasses import replace
from typing import Any

from langchain_core.runnables import RunnableConfig
from langchain_openai import ChatOpenAI

from agent.planning.utils import _emit
from agent.state import CampaignBrief, PlanningState, State

logger = logging.getLogger(__name__)

_brief_llm = ChatOpenAI(model="gpt-4o-mini", temperature=0.5)
_brief_llm_structured = _brief_llm.with_structured_output(CampaignBrief)

_BRIEF_PROMPT = """You are a social media strategist for a restaurant. Create a structured Instagram campaign brief based on the data below.

Campaign window: {date_start} to {date_end}

Restaurant profile:
{location_summary}

Public holidays during this period:
{holidays}

Peak operating day: {peak_day}
Weekend / weekday split: {weekend_share}% weekend, {weekday_share}% weekday
Primary meal period: {primary_meal_period}

Menu items available for promotion (star and puzzle items from menu engineering matrix):
{promotion_items}

Instructions:
- Design a campaign theme and tone that fits the restaurant profile and the time period.
- Recommend a posting cadence (e.g. "3x per week, heavier on weekends").
- Create a list of specific post slots covering the full campaign window at the recommended cadence.
- For each post slot assign a scheduled_date (ISO format), a theme ("holiday", "promotion", or "engagement"), a focus_item (menu item name or null), and a one-sentence key_message the executor will expand into a caption.
- Anchor "holiday" posts to the public holidays provided where relevant.
- Distribute "promotion" posts across the star and puzzle items so each item gets at least one post.
- Fill remaining slots with "engagement" posts that reinforce brand voice."""


def _format_holidays(holidays: list[dict] | None) -> str:
    if not holidays:
        return "None"
    return "\n".join(
        f"- {h.get('date')} — {h.get('name')} ({h.get('type', 'public')})"
        for h in holidays
    )


def _format_items(items: list[dict] | None) -> str:
    if not items:
        return "None available"
    lines = []
    for item in items:
        name = item.get("menu", "Unknown item")
        action = item.get("action", "")
        cm = item.get("contributionMargin")
        cm_str = f", contribution margin: {cm}" if cm is not None else ""
        lines.append(f"- {name} (category: {action}{cm_str})")
    return "\n".join(lines)


async def generate_campaign_brief(state: State, config: RunnableConfig) -> dict[str, Any]:
    """Synthesise all enriched planning context into a structured CampaignBrief via the LLM."""
    await _emit("generate_campaign_brief", "running", "Creating campaign brief...", config)

    planning = state.planning
    brief: CampaignBrief | None = None

    if planning:
        profile = planning.operatingProfile or {}
        prompt = _BRIEF_PROMPT.format(
            date_start=planning.dateStart or "unknown",
            date_end=planning.dateEnd or "unknown",
            location_summary=planning.locationSummary or "No profile available.",
            holidays=_format_holidays(planning.nationalHolidays),
            peak_day=profile.get("peakDay", "N/A"),
            weekend_share=round((profile.get("weekendShare") or 0) * 100),
            weekday_share=round((profile.get("weekdayShare") or 0) * 100),
            primary_meal_period=profile.get("primaryMealPeriod", "N/A"),
            promotion_items=_format_items(planning.promotionItems),
        )

        try:
            brief = await _brief_llm_structured.ainvoke(prompt)
        except Exception:
            logger.exception("Failed to generate campaign brief")

    post_count = len(brief.post_slots) if brief else 0
    label = f"Campaign brief ready — {post_count} post{'s' if post_count != 1 else ''} planned" if brief else "Campaign brief unavailable"
    await _emit("generate_campaign_brief", "done", label, config)

    updated_planning = (
        replace(planning, campaign_brief=brief)
        if planning
        else PlanningState(campaign_brief=brief)
    )
    return {"planning": updated_planning}
