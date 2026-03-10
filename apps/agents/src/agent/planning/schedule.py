"""Planning node: generate candidate posting dates for the campaign window."""

import logging
from datetime import datetime, timedelta
from typing import Any

from langchain_core.runnables import RunnableConfig

from agent.planning.utils import _emit, _update_planning
from agent.state import CandidateSlot, CandidateWeek, State

logger = logging.getLogger(__name__)

_MIN_DAYS_FOR_FULL_WEEK = 5


def _build_candidate_weeks(date_start: str, date_end: str) -> list[CandidateWeek]:
    """Generate all candidate posting dates grouped into campaign weeks."""
    start = datetime.strptime(date_start, "%Y-%m-%d")
    end = datetime.strptime(date_end, "%Y-%m-%d")

    weeks: dict[int, list[datetime]] = {}
    current = start
    while current <= end:
        week_number = ((current - start).days // 7) + 1
        weeks.setdefault(week_number, []).append(current)
        current += timedelta(days=1)

    candidate_weeks: list[CandidateWeek] = []
    for week_num, days in weeks.items():
        slots = [
            CandidateSlot(
                date=d.strftime("%Y-%m-%d"),
                day_name=d.strftime("%A"),
                week_number=week_num,
            )
            for d in days
        ]
        week_label = f"{days[0].strftime('%b')} {days[0].day} – {days[-1].strftime('%b')} {days[-1].day}"
        candidate_weeks.append(CandidateWeek(
            week_number=week_num,
            week_label=week_label,
            is_partial=len(days) < _MIN_DAYS_FOR_FULL_WEEK,
            slots=slots,
        ))

    return candidate_weeks


async def generate_candidate_slots(state: State, config: RunnableConfig) -> dict[str, Any]:
    """Build the full candidate date grid for the campaign window (pure computation, no LLM)."""
    await _emit("generate_candidate_slots", "running", "Building posting calendar...", config)

    planning = state.planning
    date_start = planning.dateStart if planning else None
    date_end = planning.dateEnd if planning else None

    candidate_weeks: list[CandidateWeek] = []
    if date_start and date_end:
        try:
            candidate_weeks = _build_candidate_weeks(date_start, date_end)
        except Exception:
            logger.exception(
                "Failed to build candidate slots for %s – %s", date_start, date_end
            )

    total_days = sum(len(w.slots) for w in candidate_weeks)
    await _emit(
        "generate_candidate_slots",
        "done",
        f"{len(candidate_weeks)} weeks · {total_days} candidate dates",
        config,
    )
    return {"planning": _update_planning(planning, candidateWeeks=candidate_weeks)}
