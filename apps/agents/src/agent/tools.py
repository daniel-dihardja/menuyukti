"""Agent tools that use ambient authority via RunnableConfig.

IDs (location_id, analytics_id) are injected by the server into
RunnableConfig.configurable — they are never passed as tool parameters
and therefore never visible to or controllable by the LLM.

These tools are thin async wrappers over agent.gql_client; all query
strings and HTTP logic live there.
"""

from typing import Optional

from langchain_core.runnables import RunnableConfig
from langchain_core.tools import tool

from agent.gql_client import (
    fetch_location,
    fetch_menu_engineering_matrix,
    fetch_menu_heatmaps,
    fetch_operating_profile,
    fetch_order_metrics,
)


@tool
async def get_location(config: RunnableConfig) -> dict:
    """Fetches the current restaurant location's name and address."""
    location_id = (config.get("configurable") or {}).get("location_id")
    if location_id is None:
        return {}
    return await fetch_location(location_id)


@tool
async def get_operating_profile(config: RunnableConfig) -> dict:
    """Fetches the restaurant's operating profile: weekday/weekend split, meal-period breakdown, peak day, and categorical labels (operatingPattern, diningFocus)."""
    configurable = config.get("configurable") or {}
    location_id = configurable.get("location_id")
    analytics_id = configurable.get("analytics_id")
    if location_id is None or analytics_id is None:
        return {}
    return await fetch_operating_profile(location_id, analytics_id) or {}


@tool
async def get_order_metrics(config: RunnableConfig) -> dict:
    """Fetches average order size (number of items per bill) and average order revenue for the current analytics run."""
    analytics_id = (config.get("configurable") or {}).get("analytics_id")
    if analytics_id is None:
        return {}
    return await fetch_order_metrics(analytics_id)


@tool
async def get_menu_heatmaps(config: RunnableConfig) -> list:
    """Fetches hourly and day-of-week demand heatmaps for every menu item in the current analytics run. Use this to identify peak selling times per dish."""
    analytics_id = (config.get("configurable") or {}).get("analytics_id")
    if analytics_id is None:
        return []
    return await fetch_menu_heatmaps(analytics_id)


@tool
async def get_menu_engineering_matrix(
    config: RunnableConfig,
    categories: Optional[list[str]] = None,
) -> dict:
    """Fetches the menu engineering BCG matrix for the current analytics run. Returns item-level classification (star, puzzle, plow_horse, low_end), portfolio thresholds, and recommended actions. Requires COGS to be configured. Optionally pass categories to filter items to a specific quadrant."""
    analytics_id = (config.get("configurable") or {}).get("analytics_id")
    if analytics_id is None:
        return {}
    return await fetch_menu_engineering_matrix(analytics_id, categories)
