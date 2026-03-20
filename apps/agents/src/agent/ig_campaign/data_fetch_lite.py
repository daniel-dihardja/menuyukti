"""Lite planning node: fetch location info and public holidays only (no analytics required)."""

import asyncio
import logging
from typing import Any

from langchain_core.runnables import RunnableConfig

from agent.gql_client import fetch_location_only, fetch_public_holidays
from agent.ig_campaign.node_utils import _emit, _update_planning
from agent.state import NationalHoliday, State

logger = logging.getLogger(__name__)


def _normalise_holidays(raw: list[dict[str, Any]]) -> list[NationalHoliday] | None:
    result = [
        NationalHoliday(
            id=h["id"],
            localName=h["localName"],
            name=h["name"],
            date=h["date"],
            type=h["holidayType"],
        )
        for h in raw
    ]
    return result or None


async def fetch_location_data(state: State, config: RunnableConfig) -> dict[str, Any]:
    """Fetch location info and public holidays only — no operating profile or menu data."""
    await _emit("fetch_location_data", "running", "Fetching restaurant data...", config)

    configurable = config.get("configurable") or {}
    location_id = configurable.get("location_id")
    country = configurable.get("country")

    planning = state.planning
    date_start = planning.dateStart if planning else None
    date_end = planning.dateEnd if planning else None

    coros: list[Any] = []
    if location_id is not None:
        coros.append(fetch_location_only(location_id))
    if country and date_start and date_end:
        coros.append(fetch_public_holidays(country, date_start, date_end))

    results = await asyncio.gather(*coros, return_exceptions=True)

    location: dict[str, Any] = {}
    holidays: list[NationalHoliday] | None = None

    idx = 0
    if location_id is not None:
        r = results[idx]; idx += 1
        if isinstance(r, Exception):
            logger.exception("Failed to fetch location for location_id=%s", location_id, exc_info=r)
        else:
            location = r

    if country and date_start and date_end:
        r = results[idx]; idx += 1
        if isinstance(r, Exception):
            logger.exception("Failed to fetch public holidays for country=%s", country, exc_info=r)
        else:
            holidays = _normalise_holidays(r)

    # Fallback: derive country from the location response if not in configurable
    if not (country and date_start and date_end) and date_start and date_end:
        fallback_country = location.get("country")
        if fallback_country:
            try:
                raw = await fetch_public_holidays(fallback_country, date_start, date_end)
                holidays = _normalise_holidays(raw)
            except Exception:
                logger.exception(
                    "Failed to fetch public holidays (fallback) for country=%s", fallback_country
                )

    parts: list[str] = []
    if location:
        parts.append(location.get("name") or "location found")
    if holidays:
        parts.append(f"{len(holidays)} public holiday(s)")
    await _emit(
        "fetch_location_data",
        "done",
        " · ".join(parts) if parts else "No location data available",
        config,
    )

    return {"planning": _update_planning(
        planning,
        location=location,
        nationalHolidays=holidays,
    )}
