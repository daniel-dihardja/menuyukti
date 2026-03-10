"""Planning node: fetch public holidays for the campaign window."""

import logging
from typing import Any

from langchain_core.runnables import RunnableConfig

from agent.gql_client import fetch_public_holidays
from agent.planning.utils import _emit, _update_planning
from agent.state import NationalHoliday, State

logger = logging.getLogger(__name__)


async def search_public_holidays(state: State, config: RunnableConfig) -> dict[str, Any]:
    """Fetch public holidays for the campaign location's country from the GraphQL service."""
    planning = state.planning
    date_start = planning.dateStart if planning else None
    date_end = planning.dateEnd if planning else None
    country = (planning.location or {}).get("country") if planning else None

    holidays: list[NationalHoliday] | None = None
    if country and date_start and date_end:
        await _emit(
            "search_holidays", "running",
            f"Searching public holidays in {country}...",
            config,
        )
        try:
            raw = await fetch_public_holidays(country, date_start, date_end)
            holidays = [
                NationalHoliday(
                    id=h["id"],
                    localName=h["localName"],
                    name=h["name"],
                    date=h["date"],
                    type=h["holidayType"],
                )
                for h in raw
            ] or None
        except Exception:
            logger.exception("Failed to fetch public holidays for country=%s", country)

        holiday_count = len(holidays) if holidays else 0
        await _emit(
            "search_holidays", "done",
            f"Found {holiday_count} public holiday(s) in {country}",
            config,
        )
    else:
        await _emit("search_holidays", "done", "No public holidays found", config)

    return {"planning": _update_planning(planning, nationalHolidays=holidays)}
