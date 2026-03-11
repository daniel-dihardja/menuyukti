"""Post format task: assign single vs. carousel format to each promotion slot."""

import logging
from typing import Any

from langchain_core.runnables import RunnableConfig
from langchain_openai import ChatOpenAI

from agent.config import LLM_MODEL
from agent.ig_campaign.node_utils import _emit, _format_items, _update_planning
from agent.state import (
    PostFormatPlan,
    State,
    WeekSelection,
)

logger = logging.getLogger(__name__)

_format_llm = ChatOpenAI(model=LLM_MODEL, temperature=0.2)
_format_llm_structured = _format_llm.with_structured_output(PostFormatPlan)


# ---------------------------------------------------------------------------
# Post format assignment prompt
# ---------------------------------------------------------------------------

_FORMAT_ASSIGNMENT_PROMPT = """You are deciding Instagram post formats for a restaurant campaign.

Your job is to assign a format (single post or carousel) to each promotion slot and decide which menu items to feature on it.

Promotion slots (dates with theme=promotion):
{promotion_slots}

Menu items available for promotion:
{promotion_items}

Rules:
- "star" category items must always be assigned as format="single" — they deserve a solo spotlight.
- "puzzle" and "plow_horse" category items are carousel candidates if they share a menu category or customer theme (e.g. all drinks, all snacks, all value sets).
- Holiday-pinned slots (marked [HOLIDAY]) must always be format="single".
- A maximum of 2 carousel posts per week — if more than 2 promotion slots in a week could be carousels, pick the best 2 and make the rest "single".
- Carousel posts must group 2 to 4 items. Each item should appear in at most one post across the whole campaign.
- Every promotable item must appear in at least one post. If items cannot be grouped sensibly, give them their own single post.
- For each assignment, provide:
  - scheduled_date: the date string
  - format: "single" or "carousel"
  - items: list of exactly 1 item name (single) or 2–4 item names (carousel)
  - carousel_narrative: a short angle explaining why these items belong together (carousel only, null for single)

Return one assignment per promotion slot."""


# ---------------------------------------------------------------------------
# Formatting helper
# ---------------------------------------------------------------------------

def _format_promotion_slots(
    weeks: list[WeekSelection],
    holiday_by_date: dict[str, str] | None = None,
) -> str:
    """Format only the promotion-eligible slots for the format-assignment LLM."""
    hmap = holiday_by_date or {}
    lines: list[str] = []
    for week in weeks:
        week_slots = []
        for d in week.selected_dates:
            hid = hmap.get(d)
            annotation = "  [HOLIDAY]" if hid else ""
            week_slots.append(f"  - {d}{annotation}")
        if week_slots:
            lines.append(f"Week {week.week_number}:")
            lines.extend(week_slots)
    return "\n".join(lines)


# ---------------------------------------------------------------------------
# Graph node
# ---------------------------------------------------------------------------

async def assign_post_formats(state: State, config: RunnableConfig) -> dict[str, Any]:
    """LLM decides single vs. carousel format for each promotion slot and groups items."""
    await _emit("assign_post_formats", "running", "Assigning post formats...", config)

    planning = state.planning
    post_format_plan: PostFormatPlan | None = None

    if planning and planning.postSchedule and planning.promotionItems:
        holiday_by_date: dict[str, str] = {
            h["date"]: h["id"] for h in (planning.nationalHolidays or [])
        }
        promotion_slots_str = _format_promotion_slots(
            planning.postSchedule.weeks,
            holiday_by_date=holiday_by_date,
        )
        prompt = _FORMAT_ASSIGNMENT_PROMPT.format(
            promotion_slots=promotion_slots_str,
            promotion_items=_format_items(planning.promotionItems),
        )
        try:
            post_format_plan = await _format_llm_structured.ainvoke(prompt)
        except Exception:
            logger.exception("Failed to assign post formats")

    carousel_count = sum(
        1 for a in (post_format_plan.assignments if post_format_plan else [])
        if a.format == "carousel"
    )
    single_count = sum(
        1 for a in (post_format_plan.assignments if post_format_plan else [])
        if a.format == "single"
    )
    label = (
        f"{single_count} single · {carousel_count} carousel post(s) assigned"
        if post_format_plan
        else "Post format assignment unavailable"
    )
    await _emit("assign_post_formats", "done", label, config)
    return {"planning": _update_planning(planning, postFormatPlan=post_format_plan)}
