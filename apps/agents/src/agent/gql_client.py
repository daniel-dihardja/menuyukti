"""Async GraphQL client — single access point for all backend data queries.

All GQL query strings and typed fetch functions live here. Planning nodes
and tool wrappers both import from this module; no other file should define
GQL queries or send GQL requests directly.
"""

import logging
import os
from typing import Any

import httpx

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# HTTP primitive
# ---------------------------------------------------------------------------

async def _gql(query: str, variables: dict[str, Any]) -> dict[str, Any]:
    """Execute a GraphQL query against the configured endpoint and return the `data` payload."""
    endpoint = os.environ["GRAPHQL_ENDPOINT"]
    async with httpx.AsyncClient(timeout=15) as client:
        res = await client.post(endpoint, json={"query": query, "variables": variables})
    res.raise_for_status()
    return res.json().get("data") or {}


# ---------------------------------------------------------------------------
# Query definitions
# ---------------------------------------------------------------------------

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
  menuEngineeringMatrix(analyticsRunId: $analyticsRunId, categories: $categories) {
    thresholds {
      avgPopularity
      avgContributionMargin
      totalCogs
      totalProfit
      totalMargin
    }
    distribution {
      category
      itemCount
      itemShare
      marginShare
    }
    items {
      menu
      category
      action
      quantity
      totalRevenue
      cogs
      totalCogs
      contributionMargin
      contributionMarginPercentage
      marginPerUnit
      weValue
      menuCategory
      menuCategoryDetail
    }
  }
}
"""

_MENU_CATEGORY_QUERY = """
query MenuCategoryBreakdown($analyticsRunId: ID!, $categories: [String!]) {
  menuEngineeringMatrix(analyticsRunId: $analyticsRunId, categories: $categories) {
    items {
      menuCategory
      menuCategoryDetail
      quantity
      totalRevenue
    }
  }
}
"""

_ORDER_METRICS_QUERY = """
query OrderMetrics($analyticsRunId: ID!) {
  orderMetrics(analyticsRunId: $analyticsRunId) {
    avgOrderSize
    avgOrderRevenue
  }
}
"""

_MENU_HEATMAPS_QUERY = """
query MenuHeatmaps($analyticsRunId: ID!) {
  menuHeatmaps(analyticsRunId: $analyticsRunId) {
    menu
    menuCategory
    menuCategoryDetail
    dailyHeatmap {
      hour
      quantity
    }
    weeklyHeatmap {
      day
      quantity
    }
  }
}
"""

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


# ---------------------------------------------------------------------------
# Typed fetch functions
# ---------------------------------------------------------------------------

async def fetch_location(location_id: int | str) -> dict[str, Any]:
    """Return the location record for *location_id*, or an empty dict on failure."""
    data = await _gql(_LOCATION_QUERY, {"id": str(location_id)})
    return data.get("location") or {}


async def fetch_operating_profile(
    location_id: int | str,
    analytics_id: int | str,
) -> dict[str, Any] | None:
    """Return the operating profile for the given IDs, or None on failure."""
    data = await _gql(
        _OPERATING_PROFILE_QUERY,
        {"locationId": str(location_id), "analyticsRunId": str(analytics_id)},
    )
    return data.get("operatingProfile") or None


async def fetch_menu_engineering_matrix(
    analytics_id: int | str,
    categories: list[str] | None = None,
) -> dict[str, Any]:
    """Return the full matrix payload (thresholds, distribution, items)."""
    data = await _gql(
        _MENU_ENGINEERING_MATRIX_QUERY,
        {"analyticsRunId": str(analytics_id), "categories": categories},
    )
    return data.get("menuEngineeringMatrix") or {}


async def fetch_menu_category_items(
    analytics_id: int | str,
    categories: list[str] | None = None,
) -> list[dict[str, Any]]:
    """Return menu items with category metadata for breakdown computation.

    When *categories* is provided only items in those BCG categories are
    returned (e.g. ["star", "plow_horse"] for campaign-relevant items).
    When *categories* is None the backend returns all items.
    """
    data = await _gql(
        _MENU_CATEGORY_QUERY,
        {"analyticsRunId": str(analytics_id), "categories": categories},
    )
    matrix = data.get("menuEngineeringMatrix") or {}
    return matrix.get("items") or []


async def fetch_order_metrics(analytics_id: int | str) -> dict[str, Any]:
    """Return average order size and revenue for the analytics run."""
    data = await _gql(_ORDER_METRICS_QUERY, {"analyticsRunId": str(analytics_id)})
    return data.get("orderMetrics") or {}


async def fetch_menu_heatmaps(analytics_id: int | str) -> list[dict[str, Any]]:
    """Return hourly and weekly demand heatmaps for all menu items."""
    data = await _gql(_MENU_HEATMAPS_QUERY, {"analyticsRunId": str(analytics_id)})
    return data.get("menuHeatmaps") or []


async def fetch_public_holidays(
    country: str,
    start_date: str,
    end_date: str,
) -> list[dict[str, Any]]:
    """Return public holidays for *country* within the given date range."""
    data = await _gql(
        _PUBLIC_HOLIDAYS_QUERY,
        {"country": country, "startDate": start_date, "endDate": end_date},
    )
    return data.get("publicHolidays") or []
