"""Planning node: parallel fetch of location, operating profile, and menu matrix."""

import asyncio
import logging
from typing import Any

from langchain_core.runnables import RunnableConfig

from agent.planning.utils import _emit, _gql, _update_planning
from agent.state import State

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

_OPERATING_PROFILE_QUERY = """
query OperatingProfile($locationId: ID!, $analyticsRunId: ID!) {
  operatingProfile(locationId: $locationId, analyticsRunId: $analyticsRunId) {
    totalOrders
    totalRevenue
    activeDaysCount
    avgDailyOrders
    avgOrderSize
    weekdayShare
    weekendShare
    peakDay
    primaryMealPeriod
    activeMealPeriods
    operatingPattern
    diningFocus
    operatingSummary
    mealPeriodBreakdown {
      period
      label
      orderCount
      share
      revenue
      revenueShare
    }
    dayOfWeekBreakdown {
      day
      isWeekend
      orderCount
      share
      revenue
      isPeakDay
    }
    dayTypeBreakdown {
      type
      orderCount
      share
      revenue
      revenueShare
    }
  }
}
"""

_MENU_ENGINEERING_MATRIX_QUERY = """
query MenuEngineeringMatrix($analyticsRunId: ID!, $categories: [String!]) {
  analyticsRun(id: $analyticsRunId) {
    menuEngineeringMatrix(categories: $categories) {
      thresholds {
        avgPopularity
        avgContributionMargin
      }
      items {
        menu
        category
        action
        quantity
        totalRevenue
        contributionMargin
        contributionMarginPercentage
        marginPerUnit
        menuCategory
        menuCategoryDetail
      }
    }
  }
}
"""

_PROMOTION_CATEGORIES = ["star", "puzzle"]


async def fetch_all_data(state: State, config: RunnableConfig) -> dict[str, Any]:
    """Fetch location, operating profile, and menu matrix in parallel via asyncio.gather."""
    await _emit("fetch_all_data", "running", "Fetching restaurant data...", config)

    configurable = config.get("configurable") or {}
    location_id = configurable.get("location_id")
    analytics_id = configurable.get("analytics_id")

    async def _fetch_location() -> dict[str, Any]:
        if location_id is None:
            return {}
        try:
            data = await _gql(_LOCATION_QUERY, {"id": str(location_id)})
            return data.get("location") or {}
        except Exception:
            logger.exception("Failed to fetch location for id=%s", location_id)
            return {}

    async def _fetch_profile() -> dict[str, Any] | None:
        if location_id is None or analytics_id is None:
            return None
        try:
            data = await _gql(
                _OPERATING_PROFILE_QUERY,
                {"locationId": str(location_id), "analyticsRunId": str(analytics_id)},
            )
            return data.get("operatingProfile") or None
        except Exception:
            logger.exception(
                "Failed to fetch operating profile for location_id=%s analytics_id=%s",
                location_id,
                analytics_id,
            )
            return None

    async def _fetch_menu_matrix() -> list[dict[str, Any]] | None:
        if analytics_id is None:
            return None
        try:
            data = await _gql(
                _MENU_ENGINEERING_MATRIX_QUERY,
                {"analyticsRunId": str(analytics_id), "categories": _PROMOTION_CATEGORIES},
            )
            matrix = (data.get("analyticsRun") or {}).get("menuEngineeringMatrix") or {}
            return matrix.get("items") or None
        except Exception:
            logger.exception(
                "Failed to fetch menu matrix for analytics_id=%s", analytics_id
            )
            return None

    location, profile, items = await asyncio.gather(
        _fetch_location(),
        _fetch_profile(),
        _fetch_menu_matrix(),
    )

    parts: list[str] = []
    if location:
        parts.append(location.get("name") or "location found")
    if profile:
        parts.append(f"pattern: {profile.get('operatingPattern', 'N/A')}")
    if items:
        parts.append(f"{len(items)} promotion candidate(s)")
    await _emit("fetch_all_data", "done", " · ".join(parts) if parts else "No data available", config)

    planning = state.planning
    return {"planning": _update_planning(
        planning, location=location, operatingProfile=profile, promotionItems=items
    )}
