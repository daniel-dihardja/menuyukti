"""Lite planning node: fetch location info only (no analytics required)."""

import logging
from typing import Any

from langchain_core.runnables import RunnableConfig

from agent.gql_client import fetch_location_only
from agent.ig_campaign.node_utils import _emit, _update_planning
from agent.state import State

logger = logging.getLogger(__name__)


async def fetch_location_data(state: State, config: RunnableConfig) -> dict[str, Any]:
    """Fetch location info only — no operating profile, menu data, or holiday lookup."""
    await _emit("fetch_location_data", "running", "Fetching restaurant data...", config)

    configurable = config.get("configurable") or {}
    location_id = configurable.get("location_id")

    planning = state.planning
    location: dict[str, Any] = {}

    if location_id is not None:
        try:
            location = await fetch_location_only(location_id)
        except Exception:
            logger.exception("Failed to fetch location for location_id=%s", location_id)

    label = location.get("name") or "location found" if location else "No location data available"
    await _emit("fetch_location_data", "done", label, config)

    return {"planning": _update_planning(planning, location=location)}
