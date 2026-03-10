"""Planning nodes: post schedule selection and campaign brief annotation."""

import logging
from typing import Any

from langchain_core.runnables import RunnableConfig
from langchain_openai import ChatOpenAI

from agent.planning.utils import _emit, _update_planning
from agent.state import (
    CampaignBrief,
    CandidateWeek,
    NationalHoliday,
    PostSchedule,
    PostSlot,
    State,
    WeekSelection,
)

logger = logging.getLogger(__name__)

_MIN_POSTS_FULL_WEEK = 3
_MAX_POSTS_PER_WEEK = 5
_MIN_DAYS_FULL_WEEK = 5

_schedule_llm = ChatOpenAI(model="gpt-4o-mini", temperature=0.3)
_schedule_llm_structured = _schedule_llm.with_structured_output(PostSchedule)

_brief_llm = ChatOpenAI(model="gpt-4o-mini", temperature=0.5)
_brief_llm_structured = _brief_llm.with_structured_output(CampaignBrief)

# ---------------------------------------------------------------------------
# Schedule selection prompt
# ---------------------------------------------------------------------------

_SCHEDULE_PROMPT = """You are scheduling Instagram posts for a restaurant.

Campaign context:
{location_summary}

Public holidays during this period:
{holidays}

Operating data:
- Peak day: {peak_day}
- Weekend / weekday split: {weekend_share}% weekend, {weekday_share}% weekday
- Primary meal period: {primary_meal_period}

For each week below, select the best posting dates to maximise engagement:
- Select exactly 3, 4, or 5 dates for full weeks.
- For partial weeks (marked as such), select at least 1 date.
- Prefer peak days, weekends (if weekend share is significant), and days adjacent to public holidays.

{candidate_weeks_section}"""


# ---------------------------------------------------------------------------
# Campaign brief annotation prompt
# ---------------------------------------------------------------------------

_BRIEF_PROMPT = """You are a social media strategist for a restaurant. Annotate the post schedule below with campaign strategy and content directives.

Campaign window: {date_start} to {date_end}

Restaurant profile:
{location_summary}

Public holidays during this period:
{holidays}

Menu items available for promotion (star and puzzle items):
{promotion_items}

Post dates to annotate:
{post_dates_section}

Instructions:
- Design a campaign theme and tone that fits the restaurant profile and the time period.
- For each post date, assign:
  - theme: "holiday" (anchor to a nearby public holiday), "promotion" (feature a menu item), or "engagement" (brand voice)
  - focus_item: the menu item name for promotion posts, null otherwise
  - caption_seed: a one-sentence directive that will be expanded into a full caption by the executor
- Anchor "holiday" posts to the public holidays provided where relevant.
- Distribute "promotion" posts across the star and puzzle items so each item gets at least one post.
- Fill remaining slots with "engagement" posts that reinforce brand voice."""


# ---------------------------------------------------------------------------
# Formatting helpers
# ---------------------------------------------------------------------------

def _format_candidate_weeks(weeks: list[CandidateWeek]) -> str:
    lines: list[str] = []
    for week in weeks:
        partial_note = " (partial week — select at least 1)" if week.is_partial else f" (select {_MIN_POSTS_FULL_WEEK} to {_MAX_POSTS_PER_WEEK})"
        lines.append(f"## Week {week.week_number} — {week.week_label}{partial_note}")
        for slot in week.slots:
            lines.append(f"- {slot.date}  {slot.day_name}")
        lines.append("")
    return "\n".join(lines).strip()


def _format_post_dates(weeks: list[WeekSelection]) -> str:
    lines: list[str] = []
    for week in weeks:
        lines.append(f"Week {week.week_number}:")
        for d in week.selected_dates:
            lines.append(f"  - {d}")
    return "\n".join(lines)


def _format_holidays(holidays: list[NationalHoliday] | None) -> str:
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


# ---------------------------------------------------------------------------
# Post-parse validation
# ---------------------------------------------------------------------------

def _validate_and_clamp(
    schedule: PostSchedule,
    candidate_weeks: list[CandidateWeek],
) -> PostSchedule:
    """
    Validate selected dates against candidates, clamp to max, and enforce
    the 3-minimum for full weeks by logging warnings (not raising).
    """
    valid_dates_by_week: dict[int, set[str]] = {
        w.week_number: {s.date for s in w.slots}
        for w in candidate_weeks
    }
    is_partial_by_week: dict[int, bool] = {
        w.week_number: w.is_partial for w in candidate_weeks
    }

    cleaned_weeks: list[WeekSelection] = []
    for ws in schedule.weeks:
        valid = valid_dates_by_week.get(ws.week_number, set())
        # Filter out any dates the model hallucinated outside the candidate list
        filtered = [d for d in ws.selected_dates if d in valid]
        if len(filtered) != len(ws.selected_dates):
            hallucinated = set(ws.selected_dates) - valid
            logger.warning(
                "Week %d: removed hallucinated dates %s", ws.week_number, hallucinated
            )
        # Enforce max (Pydantic already does this, but defensive clamp)
        clamped = filtered[:_MAX_POSTS_PER_WEEK]
        # Warn (don't raise) if a full week has fewer than 3
        if not is_partial_by_week.get(ws.week_number, False) and len(clamped) < _MIN_POSTS_FULL_WEEK:
            logger.warning(
                "Week %d: only %d dates selected (min %d for full week)",
                ws.week_number, len(clamped), _MIN_POSTS_FULL_WEEK,
            )
        cleaned_weeks.append(WeekSelection(week_number=ws.week_number, selected_dates=clamped))

    return PostSchedule(weeks=cleaned_weeks)


# ---------------------------------------------------------------------------
# Graph nodes
# ---------------------------------------------------------------------------

async def generate_post_schedule(state: State, config: RunnableConfig) -> dict[str, Any]:
    """LLM selects 3–5 posting dates per week from the pre-built candidate calendar."""
    await _emit("generate_post_schedule", "running", "Selecting post dates...", config)

    planning = state.planning
    schedule: PostSchedule | None = None

    if planning and planning.candidateWeeks:
        profile = planning.operatingProfile or {}
        prompt = _SCHEDULE_PROMPT.format(
            location_summary=planning.locationSummary or "No profile available.",
            holidays=_format_holidays(planning.nationalHolidays),
            peak_day=profile.get("peakDay", "N/A"),
            weekend_share=round((profile.get("weekendShare") or 0) * 100),
            weekday_share=round((profile.get("weekdayShare") or 0) * 100),
            primary_meal_period=profile.get("primaryMealPeriod", "N/A"),
            candidate_weeks_section=_format_candidate_weeks(planning.candidateWeeks),
        )
        try:
            raw_schedule = await _schedule_llm_structured.ainvoke(prompt)
            schedule = _validate_and_clamp(raw_schedule, planning.candidateWeeks)
        except Exception:
            logger.exception("Failed to generate post schedule")

    total = sum(len(w.selected_dates) for w in schedule.weeks) if schedule else 0
    await _emit(
        "generate_post_schedule",
        "done",
        f"{total} post date(s) selected across {len(schedule.weeks)} week(s)" if schedule else "Post schedule unavailable",
        config,
    )
    return {"planning": _update_planning(planning, postSchedule=schedule)}


async def generate_campaign_brief(state: State, config: RunnableConfig) -> dict[str, Any]:
    """LLM annotates the selected post dates with campaign theme, tone, and caption directives."""
    await _emit("generate_campaign_brief", "running", "Creating campaign brief...", config)

    planning = state.planning
    brief: CampaignBrief | None = None

    if planning and planning.postSchedule:
        prompt = _BRIEF_PROMPT.format(
            date_start=planning.dateStart or "unknown",
            date_end=planning.dateEnd or "unknown",
            location_summary=planning.locationSummary or "No profile available.",
            holidays=_format_holidays(planning.nationalHolidays),
            promotion_items=_format_items(planning.promotionItems),
            post_dates_section=_format_post_dates(planning.postSchedule.weeks),
        )
        try:
            brief = await _brief_llm_structured.ainvoke(prompt)
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
