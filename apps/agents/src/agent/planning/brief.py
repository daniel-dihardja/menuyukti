"""Planning nodes: post schedule selection and campaign brief annotation."""

import logging
from typing import Any

from langchain_core.runnables import RunnableConfig
from langchain_openai import ChatOpenAI

from agent.config import LLM_MODEL
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

_SCHEDULE_PROMPT_VERSION = "v2"
_BRIEF_PROMPT_VERSION = "v2"

_schedule_llm = ChatOpenAI(model=LLM_MODEL, temperature=0.3)
_schedule_llm_structured = _schedule_llm.with_structured_output(PostSchedule)

_brief_llm = ChatOpenAI(model=LLM_MODEL, temperature=0.5)
_brief_llm_structured = _brief_llm.with_structured_output(CampaignBrief)

# ---------------------------------------------------------------------------
# Schedule selection prompt
# ---------------------------------------------------------------------------

_SCHEDULE_PROMPT = """You are scheduling Instagram posts for a restaurant.

Campaign context:
{location_summary}

Public holidays during this period (canonical list — do not invent or move dates):
{holidays}

The holiday list above is the authoritative source of truth. Do not treat any date \
as a public holiday unless it appears in that list with a [HOLIDAY_ID] tag. \
Dates marked [HOLIDAY_ID] in the candidate list below are the exact holiday dates.

Operating data:
- Peak day: {peak_day}
- Weekend / weekday split: {weekend_share}% weekend, {weekday_share}% weekday
- Primary meal period: {primary_meal_period}

For each week below, select the best posting dates to maximise engagement:
- Dates marked [PINNED — HOLIDAY_ID] are public holidays and are already included in the schedule — do NOT re-select them.
- For each full week, select only the additional dates indicated in the week header (e.g. "select 2 to 4 more").
- For partial weeks (marked as such), select at least 1 more date.
- Prefer peak days, weekends (if weekend share is significant), and days adjacent to public holidays.

{candidate_weeks_section}"""


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

Menu items available for promotion (star and puzzle items):
{promotion_items}

Post dates to annotate:
{post_dates_section}

Instructions:
- Design a campaign theme and tone that fits the restaurant profile and the time period.
- For each post date, assign:
  - theme: "holiday" (only for dates marked [HOLIDAY_ID]), "promotion" (feature a menu item), or "engagement" (brand voice)
  - focus_item: the menu item name for promotion posts, null otherwise
  - caption_seed: a one-sentence directive that will be expanded into a full caption by the executor
- Anchor "holiday" posts only to dates explicitly marked with a [HOLIDAY_ID].
- Distribute "promotion" posts across the star and puzzle items so each item gets at least one post.
- Fill remaining slots with "engagement" posts that reinforce brand voice."""


# ---------------------------------------------------------------------------
# Formatting helpers
# ---------------------------------------------------------------------------

def _format_candidate_weeks(weeks: list[CandidateWeek]) -> str:
    lines: list[str] = []
    for week in weeks:
        pinned_count = sum(1 for s in week.slots if s.is_pinned)
        if week.is_partial:
            note = " (partial week — select at least 1 more)"
        else:
            remaining_min = max(0, _MIN_POSTS_FULL_WEEK - pinned_count)
            remaining_max = max(0, _MAX_POSTS_PER_WEEK - pinned_count)
            if pinned_count:
                note = f" (select {remaining_min} to {remaining_max} more; {pinned_count} holiday already pinned)"
            else:
                note = f" (select {_MIN_POSTS_FULL_WEEK} to {_MAX_POSTS_PER_WEEK})"
        lines.append(f"## Week {week.week_number} — {week.week_label}{note}")
        for slot in week.slots:
            if slot.is_pinned:
                annotation = f"  [PINNED — {slot.holiday_id}]"
            elif slot.proximity:
                annotation = f"  ({slot.proximity})"
            else:
                annotation = ""
            lines.append(f"- {slot.date}  {slot.day_name}{annotation}")
        lines.append("")
    return "\n".join(lines).strip()


def _format_post_dates(
    weeks: list[WeekSelection],
    holiday_by_date: dict[str, str] | None = None,
) -> str:
    hmap = holiday_by_date or {}
    lines: list[str] = []
    for week in weeks:
        lines.append(f"Week {week.week_number}:")
        for d in week.selected_dates:
            hid = hmap.get(d)
            annotation = f"  [{hid}]" if hid else ""
            lines.append(f"  - {d}{annotation}")
    return "\n".join(lines)


def _format_holidays(holidays: list[NationalHoliday] | None) -> str:
    if not holidays:
        return "None"
    return "\n".join(
        f"- [{h.get('id')}] {h.get('date')} — {h.get('name')} ({h.get('type', 'public')})"
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
# Post-parse validation and pinned-slot injection
# ---------------------------------------------------------------------------

def _inject_pinned_slots(
    schedule: PostSchedule,
    candidate_weeks: list[CandidateWeek],
) -> PostSchedule:
    """Guarantee all pinned (holiday) slots appear first in the selection.

    Pinned dates are prepended before any LLM-selected dates and deduplicated,
    so holidays are always present regardless of what the LLM returned.
    """
    pinned_by_week: dict[int, list[str]] = {
        w.week_number: [s.date for s in w.slots if s.is_pinned]
        for w in candidate_weeks
    }
    return PostSchedule(weeks=[
        WeekSelection(
            week_number=ws.week_number,
            selected_dates=list(dict.fromkeys(
                pinned_by_week.get(ws.week_number, []) + ws.selected_dates
            )),
        )
        for ws in schedule.weeks
    ])


def _validate_and_clamp(
    schedule: PostSchedule,
    candidate_weeks: list[CandidateWeek],
) -> PostSchedule:
    """Validate selected dates against candidates, clamp non-pinned to max, and enforce
    the 3-minimum for full weeks by logging warnings (not raising).

    Pinned (holiday) slots are never clamped out — they are preserved even if the total
    exceeds _MAX_POSTS_PER_WEEK.
    """
    valid_dates_by_week: dict[int, set[str]] = {
        w.week_number: {s.date for s in w.slots}
        for w in candidate_weeks
    }
    pinned_by_week: dict[int, set[str]] = {
        w.week_number: {s.date for s in w.slots if s.is_pinned}
        for w in candidate_weeks
    }
    is_partial_by_week: dict[int, bool] = {
        w.week_number: w.is_partial for w in candidate_weeks
    }

    cleaned_weeks: list[WeekSelection] = []
    for ws in schedule.weeks:
        valid = valid_dates_by_week.get(ws.week_number, set())
        pinned = pinned_by_week.get(ws.week_number, set())
        # Filter out any dates the model hallucinated outside the candidate list
        filtered = [d for d in ws.selected_dates if d in valid]
        if len(filtered) != len(ws.selected_dates):
            hallucinated = set(ws.selected_dates) - valid
            logger.warning(
                "Week %d: removed hallucinated dates %s", ws.week_number, hallucinated
            )
        # Clamp non-pinned dates to max; pinned dates are always kept
        pinned_selected = [d for d in filtered if d in pinned]
        non_pinned_selected = [d for d in filtered if d not in pinned]
        remaining_cap = max(0, _MAX_POSTS_PER_WEEK - len(pinned_selected))
        clamped = pinned_selected + non_pinned_selected[:remaining_cap]
        # Warn (don't raise) if a full week has fewer than 3
        if not is_partial_by_week.get(ws.week_number, False) and len(clamped) < _MIN_POSTS_FULL_WEEK:
            logger.warning(
                "Week %d: only %d dates selected (min %d for full week)",
                ws.week_number, len(clamped), _MIN_POSTS_FULL_WEEK,
            )
        cleaned_weeks.append(WeekSelection(week_number=ws.week_number, selected_dates=clamped))

    return PostSchedule(weeks=cleaned_weeks)


def _derive_holiday_ids(
    brief: CampaignBrief,
    holidays: list[NationalHoliday] | None,
) -> CampaignBrief:
    """Populate PostSlot.holiday_id server-side from the canonical holiday map.

    The LLM is never asked to set holiday_id; this function derives it
    deterministically after the model returns. It also downgrades any slot
    where the model assigned theme='holiday' on a non-holiday date.
    """
    holiday_by_date: dict[str, str] = {h["date"]: h["id"] for h in (holidays or [])}
    fixed_slots: list[PostSlot] = []
    for slot in brief.post_slots:
        hid = holiday_by_date.get(slot.scheduled_date)
        if slot.theme == "holiday" and not hid:
            logger.warning(
                "PostSlot on %s has theme='holiday' but is not a holiday date; "
                "downgrading theme to 'engagement'",
                slot.scheduled_date,
            )
            slot = slot.model_copy(update={"theme": "engagement", "holiday_id": None, "source": "llm_suggested"})
        else:
            slot = slot.model_copy(update={"holiday_id": hid, "source": "holiday_pinned" if hid else "llm_suggested"})
        fixed_slots.append(slot)
    return brief.model_copy(update={"post_slots": sorted(fixed_slots, key=lambda s: s.scheduled_date)})


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
            injected = _inject_pinned_slots(raw_schedule, planning.candidateWeeks)
            schedule = _validate_and_clamp(injected, planning.candidateWeeks)
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
        holiday_by_date: dict[str, str] = {
            h["date"]: h["id"] for h in (planning.nationalHolidays or [])
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
            ),
        )
        try:
            raw_brief = await _brief_llm_structured.ainvoke(prompt)
            brief = _derive_holiday_ids(raw_brief, planning.nationalHolidays)
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
