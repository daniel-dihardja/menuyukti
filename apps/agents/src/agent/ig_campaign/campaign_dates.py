"""Pure date helpers and planning node for campaign scheduling."""

import calendar
import logging
from datetime import datetime
from typing import Any

from langchain_core.runnables import RunnableConfig

from agent.ig_campaign.node_utils import _update_planning

logger = logging.getLogger(__name__)


def _get_current_date() -> str:
    """Return today's date in YYYY-MM-DD format."""
    return datetime.now().strftime("%Y-%m-%d")


def _compute_campaign_dates() -> tuple[str, str]:
    """Return (dateStart, dateEnd) for the next calendar month.

    Used only as a fallback when the UI has not provided explicit dates.
    """
    today = datetime.strptime(_get_current_date(), "%Y-%m-%d")
    year, month = today.year, today.month + 1
    if month > 12:
        month = 1
        year += 1
    last_day = calendar.monthrange(year, month)[1]
    date_start = datetime(year, month, 1).strftime("%Y-%m-%d")
    date_end = datetime(year, month, last_day).strftime("%Y-%m-%d")
    return date_start, date_end


async def generate_plan(state: Any, config: RunnableConfig) -> dict[str, Any]:
    """Set campaign start and end dates.

    Dates are sourced in priority order:
    1. UI-provided values forwarded via configurable (date_start / date_end)
    2. Existing values already in thread state (set by a prior run in this session)
    3. Computed fallback: first and last day of next calendar month

    Preserves all other fields already in PlanningState so that foundation-phase
    data (locationSummary, nationalHolidays, location) is not wiped when the
    campaign plan runs in the same thread.
    """
    configurable = config.get("configurable") or {}
    ui_date_start = configurable.get("date_start")
    ui_date_end = configurable.get("date_end")

    existing_planning = state.planning
    existing_start = existing_planning.dateStart if existing_planning else None
    existing_end = existing_planning.dateEnd if existing_planning else None

    if ui_date_start and ui_date_end:
        date_start, date_end = ui_date_start, ui_date_end
        logger.debug("generate_plan: using UI-provided dates %s – %s", date_start, date_end)
    elif existing_start and existing_end:
        date_start, date_end = existing_start, existing_end
        logger.debug("generate_plan: reusing thread dates %s – %s", date_start, date_end)
    else:
        date_start, date_end = _compute_campaign_dates()
        logger.debug("generate_plan: computed fallback dates %s – %s", date_start, date_end)

    return {"planning": _update_planning(existing_planning, dateStart=date_start, dateEnd=date_end)}
