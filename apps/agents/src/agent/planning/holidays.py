"""Planning node: fetch location details and public holidays."""

import logging
import os
from dataclasses import replace
from typing import Any

import httpx
from langchain_core.runnables import RunnableConfig

from agent.planning.utils import _emit
from agent.state import NationalHoliday, PlanningState, State

logger = logging.getLogger(__name__)

_LOCATION_QUERY = """
query Location($id: ID!) {
  location(id: $id) {
    id
    name
    street
    city
    country
  }
}
"""

_PUBLIC_HOLIDAYS_QUERY = """
query PublicHolidays($country: String!, $startDate: String!, $endDate: String!) {
  publicHolidays(country: $country, startDate: $startDate, endDate: $endDate) {
    date
    name
    localName
    holidayType
    isTentative
  }
}
"""


async def _fetch_location(config: RunnableConfig) -> tuple[str | None, str | None]:
    """Fetch city and country for the configured location via GraphQL."""
    await _emit("fetch_location", "running", "Looking for location address...", config)

    city: str | None = None
    country: str | None = None

    location_id = (config.get("configurable") or {}).get("location_id")
    if location_id is not None:
        try:
            endpoint = os.environ["GRAPHQL_ENDPOINT"]
            async with httpx.AsyncClient(timeout=10) as client:
                res = await client.post(
                    endpoint,
                    json={"query": _LOCATION_QUERY, "variables": {"id": str(location_id)}},
                )
            res.raise_for_status()
            loc = res.json().get("data", {}).get("location") or {}
            city = loc.get("city")
            country = loc.get("country")
        except Exception:
            logger.exception("Failed to fetch location for id=%s", location_id)

    await _emit("fetch_location", "done", "Location address found", config)
    return city, country


async def fetch_full_location(config: RunnableConfig) -> dict[str, Any]:
    """Fetch full location record (name, street, city, country) via GraphQL."""
    location_id = (config.get("configurable") or {}).get("location_id")
    if location_id is None:
        return {}
    try:
        endpoint = os.environ["GRAPHQL_ENDPOINT"]
        async with httpx.AsyncClient(timeout=10) as client:
            res = await client.post(
                endpoint,
                json={"query": _LOCATION_QUERY, "variables": {"id": str(location_id)}},
            )
        res.raise_for_status()
        return res.json().get("data", {}).get("location") or {}
    except Exception:
        logger.exception("Failed to fetch full location for id=%s", location_id)
        return {}


async def search_public_holidays(state: State, config: RunnableConfig) -> dict[str, Any]:
    """Fetch public holidays for the campaign location's country from the GraphQL service."""
    planning = state.planning
    date_start = planning.dateStart if planning else None
    date_end = planning.dateEnd if planning else None

    _, country = await _fetch_location(config)

    holidays: list[NationalHoliday] | None = None
    if country and date_start and date_end:
        await _emit(
            "search_holidays", "running",
            f"Searching public holidays in {country}...",
            config,
        )
        try:
            endpoint = os.environ["GRAPHQL_ENDPOINT"]
            async with httpx.AsyncClient(timeout=10) as client:
                res = await client.post(
                    endpoint,
                    json={
                        "query": _PUBLIC_HOLIDAYS_QUERY,
                        "variables": {
                            "country": country,
                            "startDate": date_start,
                            "endDate": date_end,
                        },
                    },
                )
            res.raise_for_status()
            raw = res.json().get("data", {}).get("publicHolidays") or []
            holidays = [
                NationalHoliday(
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

    updated_planning = (
        replace(planning, nationalHolidays=holidays)
        if planning
        else PlanningState(nationalHolidays=holidays)
    )
    return {"planning": updated_planning}
