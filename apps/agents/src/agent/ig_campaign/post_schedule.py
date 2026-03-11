"""Post schedule task: select optimal posting dates from the candidate calendar."""

import logging
from typing import Any

from langchain_core.runnables import RunnableConfig
from langchain_openai import ChatOpenAI

from agent.config import LLM_MODEL
from agent.ig_campaign.node_utils import _emit, _format_holidays, _update_planning
from agent.state import (
    CandidateWeek,
    PostSchedule,
    State,
    WeekSelection,
)

logger = logging.getLogger(__name__)

_MIN_POSTS_FULL_WEEK = 3
_MAX_POSTS_PER_WEEK = 5
_MIN_DAYS_FULL_WEEK = 5

_SCHEDULE_PROMPT_VERSION = "v2"

_schedule_llm = ChatOpenAI(model=LLM_MODEL, temperature=0.3)
_schedule_llm_structured = _schedule_llm.with_structured_output(PostSchedule)


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
        filtered = [d for d in ws.selected_dates if d in valid]
        if len(filtered) != len(ws.selected_dates):
            hallucinated = set(ws.selected_dates) - valid
            logger.warning(
                "Week %d: removed hallucinated dates %s", ws.week_number, hallucinated
            )
        pinned_selected = [d for d in filtered if d in pinned]
        non_pinned_selected = [d for d in filtered if d not in pinned]
        remaining_cap = max(0, _MAX_POSTS_PER_WEEK - len(pinned_selected))
        clamped = pinned_selected + non_pinned_selected[:remaining_cap]
        if not is_partial_by_week.get(ws.week_number, False) and len(clamped) < _MIN_POSTS_FULL_WEEK:
            logger.warning(
                "Week %d: only %d dates selected (min %d for full week)",
                ws.week_number, len(clamped), _MIN_POSTS_FULL_WEEK,
            )
        cleaned_weeks.append(WeekSelection(week_number=ws.week_number, selected_dates=clamped))

    return PostSchedule(weeks=cleaned_weeks)


# ---------------------------------------------------------------------------
# Graph node
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
