"""Campaign brief task: annotate the post schedule with theme, tone, and caption directives."""

import logging
from typing import Any

from langchain_core.runnables import RunnableConfig
from langchain_openai import ChatOpenAI

from agent.config import LLM_MODEL
from agent.ig_campaign.node_utils import _emit, _format_holidays, _format_items, _update_planning
from agent.state import (
    CampaignBrief,
    FormatAssignment,
    NationalHoliday,
    PostFormatPlan,
    PostSlot,
    State,
    WeekSelection,
)

logger = logging.getLogger(__name__)

_BRIEF_PROMPT_VERSION = "v2"

_brief_llm = ChatOpenAI(model=LLM_MODEL, temperature=0.5)
_brief_llm_structured = _brief_llm.with_structured_output(CampaignBrief)


# ---------------------------------------------------------------------------
# Campaign brief annotation prompt
# ---------------------------------------------------------------------------

_BRIEF_PROMPT = """You are a social media strategist for a restaurant. Annotate the post schedule below with campaign strategy and content directives.

Campaign window: {date_start} to {date_end}

Restaurant profile:
{location_summary}

Public holidays during this period (canonical list — do not invent or move dates):
{holidays}

Holiday-themed posts must anchor to dates marked with a [HOLIDAY_ID] in the post \
dates list below. Do not assign theme="holiday" to a date that is not marked as a \
holiday — use theme="engagement" or theme="promotion" for those dates instead.

Menu items available for promotion (star, plow_horse, and puzzle items):
{promotion_items}

Post dates to annotate:
{post_dates_section}

Instructions:
- Design a campaign theme and tone that fits the restaurant profile and the time period.
- For each post date, assign:
  - theme: "holiday" (only for dates marked [HOLIDAY_ID]), "promotion" (feature a menu item), or "engagement" (brand voice)
  - focus_item: the promoted item name for single-format promotion posts, null otherwise
  - caption_seed: a one-sentence directive that will be expanded into a full caption by the executor
- Anchor "holiday" posts only to dates explicitly marked with a [HOLIDAY_ID].
- For promotion slots marked [SINGLE: item], write a caption_seed focused on that one item.
- For promotion slots marked [CAROUSEL: item1 · item2 · ...], write a caption_seed that introduces all items as a curated set using the provided narrative angle.
- Fill remaining slots with "engagement" posts that reinforce brand voice."""


# ---------------------------------------------------------------------------
# Meal period → recommended posting time
# ---------------------------------------------------------------------------

_MEAL_PERIOD_TO_TIME: dict[str, str] = {
    "breakfast":  "07:00",
    "lunch":      "11:00",
    "afternoon":  "14:00",
    "dinner":     "17:00",
    "late_night": "20:00",
}


# ---------------------------------------------------------------------------
# Formatting helpers
# ---------------------------------------------------------------------------

def _format_post_dates(
    weeks: list[WeekSelection],
    holiday_by_date: dict[str, str] | None = None,
    format_by_date: dict[str, FormatAssignment] | None = None,
) -> str:
    hmap = holiday_by_date or {}
    fmap = format_by_date or {}
    lines: list[str] = []
    for week in weeks:
        lines.append(f"Week {week.week_number}:")
        for d in week.selected_dates:
            hid = hmap.get(d)
            holiday_annotation = f"  [{hid}]" if hid else ""
            assignment = fmap.get(d)
            if assignment:
                if assignment.format == "carousel":
                    items_str = " · ".join(assignment.items)
                    narrative = f" — {assignment.carousel_narrative}" if assignment.carousel_narrative else ""
                    format_annotation = f"  [CAROUSEL: {items_str}{narrative}]"
                else:
                    item_str = assignment.items[0] if assignment.items else ""
                    format_annotation = f"  [SINGLE: {item_str}]" if item_str else ""
            else:
                format_annotation = ""
            lines.append(f"  - {d}{holiday_annotation}{format_annotation}")
    return "\n".join(lines)


# ---------------------------------------------------------------------------
# Post-parse enrichment
# ---------------------------------------------------------------------------

def _derive_holiday_ids(
    brief: CampaignBrief,
    holidays: list[NationalHoliday] | None,
    post_format_plan: PostFormatPlan | None = None,
    primary_meal_period: str | None = None,
) -> CampaignBrief:
    """Populate PostSlot.holiday_id, carousel fields, and scheduled_time server-side.

    holiday_id is derived deterministically from the canonical holiday map.
    format/carousel_items/carousel_narrative are copied from postFormatPlan assignments.
    scheduled_time is derived from primaryMealPeriod via _MEAL_PERIOD_TO_TIME.
    The LLM is never asked to set these fields directly.
    """
    holiday_by_date: dict[str, str] = {h["date"]: h["id"] for h in (holidays or [])}
    format_by_date: dict[str, FormatAssignment] = {
        a.scheduled_date: a for a in (post_format_plan.assignments if post_format_plan else [])
    }
    scheduled_time = _MEAL_PERIOD_TO_TIME.get(primary_meal_period or "", "09:00")
    fixed_slots: list[PostSlot] = []
    for slot in brief.post_slots:
        hid = holiday_by_date.get(slot.scheduled_date)
        if slot.theme == "holiday" and not hid:
            logger.warning(
                "PostSlot on %s has theme='holiday' but is not a holiday date; "
                "downgrading theme to 'engagement'",
                slot.scheduled_date,
            )
            slot = slot.model_copy(update={"theme": "engagement", "holiday_id": None, "source": "llm_suggested", "scheduled_time": scheduled_time})
        else:
            slot = slot.model_copy(update={"holiday_id": hid, "source": "holiday_pinned" if hid else "llm_suggested", "scheduled_time": scheduled_time})

        assignment = format_by_date.get(slot.scheduled_date)
        if assignment and slot.theme == "promotion":
            if assignment.format == "carousel":
                slot = slot.model_copy(update={
                    "format": "carousel",
                    "carousel_items": assignment.items,
                    "carousel_narrative": assignment.carousel_narrative,
                    "focus_item": None,
                })
            else:
                slot = slot.model_copy(update={
                    "format": "single",
                    "focus_item": assignment.items[0] if assignment.items else slot.focus_item,
                    "carousel_items": None,
                    "carousel_narrative": None,
                })

        fixed_slots.append(slot)
    return brief.model_copy(update={"post_slots": sorted(fixed_slots, key=lambda s: s.scheduled_date)})


# ---------------------------------------------------------------------------
# Graph node
# ---------------------------------------------------------------------------

async def generate_campaign_brief(state: State, config: RunnableConfig) -> dict[str, Any]:
    """LLM annotates the selected post dates with campaign theme, tone, and caption directives."""
    await _emit("generate_campaign_brief", "running", "Creating campaign brief...", config)

    planning = state.planning
    brief: CampaignBrief | None = None

    if planning and planning.postSchedule:
        holiday_by_date: dict[str, str] = {
            h["date"]: h["id"] for h in (planning.nationalHolidays or [])
        }
        format_by_date: dict[str, FormatAssignment] = {
            a.scheduled_date: a
            for a in (planning.postFormatPlan.assignments if planning.postFormatPlan else [])
        }
        prompt = _BRIEF_PROMPT.format(
            date_start=planning.dateStart or "unknown",
            date_end=planning.dateEnd or "unknown",
            location_summary=planning.locationSummary or "No profile available.",
            holidays=_format_holidays(planning.nationalHolidays),
            promotion_items=_format_items(planning.promotionItems),
            post_dates_section=_format_post_dates(
                planning.postSchedule.weeks,
                holiday_by_date=holiday_by_date,
                format_by_date=format_by_date,
            ),
        )
        try:
            raw_brief = await _brief_llm_structured.ainvoke(prompt)
            primary_meal_period = (planning.operatingProfile or {}).get("primaryMealPeriod")
            brief = _derive_holiday_ids(raw_brief, planning.nationalHolidays, planning.postFormatPlan, primary_meal_period)
        except Exception:
            logger.exception("Failed to generate campaign brief")

    post_count = len(brief.post_slots) if brief else 0
    label = (
        f"Campaign brief ready — {post_count} post{'s' if post_count != 1 else ''} planned"
        if brief
        else "Campaign brief unavailable"
    )
    await _emit("generate_campaign_brief", "done", label, config)
    return {"planning": _update_planning(planning, campaign_brief=brief)}
