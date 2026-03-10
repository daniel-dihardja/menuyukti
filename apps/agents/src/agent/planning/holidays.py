"""Planning node: fetch public holidays for the campaign window."""

import logging
from typing import Any

from langchain_core.runnables import RunnableConfig

from agent.planning.utils import _emit, _gql, _update_planning
from agent.state import NationalHoliday, State

logger = logging.getLogger(__name__)

_PUBLIC_HOLIDAYS_QUERY = """
query PublicHolidays($country: String!, $startDate: String!, $endDate: String!) {
  publicHolidays(country: $country, startDate: $startDate, endDate: $endDate) {
    id
    date
    name
    localName
    holidayType
    isTentative
  }
}
"""


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
            data = await _gql(
                _PUBLIC_HOLIDAYS_QUERY,
                {"country": country, "startDate": date_start, "endDate": date_end},
            )
            raw = data.get("publicHolidays") or []
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
