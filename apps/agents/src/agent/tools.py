"""Agent tools that use ambient authority via RunnableConfig.

IDs (location_id, analytics_id) are injected by the server into
RunnableConfig.configurable — they are never passed as tool parameters
and therefore never visible to or controllable by the LLM.
"""

import os
from typing import Optional

import httpx
from langchain_core.runnables import RunnableConfig
from langchain_core.tools import tool

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
      quantity
      totalRevenue
      cogs
      totalCogs
      contributionMargin
      contributionMarginPercentage
      marginPerUnit
      weValue
      category
      action
      menuCategory
      menuCategoryDetail
    }
  }
}
"""


def _graphql_post(query: str, variables: dict) -> dict:
    endpoint = os.environ["GRAPHQL_ENDPOINT"]
    res = httpx.post(
        endpoint,
        json={"query": query, "variables": variables},
        timeout=30,
    )
    res.raise_for_status()
    return res.json().get("data") or {}


@tool
def get_location(config: RunnableConfig) -> dict:
    """Fetches the current restaurant location's name and address."""
    location_id = (config.get("configurable") or {}).get("location_id")
    if location_id is None:
        return {}
    data = _graphql_post(_LOCATION_QUERY, {"id": str(location_id)})
    return data.get("location") or {}


@tool
def get_operating_profile(config: RunnableConfig) -> dict:
    """Fetches the restaurant's operating profile: weekday/weekend split, meal-period breakdown, peak day, and categorical labels (operatingPattern, diningFocus)."""
    configurable = config.get("configurable") or {}
    location_id = configurable.get("location_id")
    analytics_id = configurable.get("analytics_id")
    if location_id is None or analytics_id is None:
        return {}
    data = _graphql_post(
        _OPERATING_PROFILE_QUERY,
        {
            "locationId": str(location_id),
            "analyticsRunId": str(analytics_id),
        },
    )
    return data.get("operatingProfile") or {}


@tool
def get_order_metrics(config: RunnableConfig) -> dict:
    """Fetches average order size (number of items per bill) and average order revenue for the current analytics run."""
    analytics_id = (config.get("configurable") or {}).get("analytics_id")
    if analytics_id is None:
        return {}
    data = _graphql_post(_ORDER_METRICS_QUERY, {"analyticsRunId": str(analytics_id)})
    return data.get("orderMetrics") or {}


@tool
def get_menu_heatmaps(config: RunnableConfig) -> list:
    """Fetches hourly and day-of-week demand heatmaps for every menu item in the current analytics run. Use this to identify peak selling times per dish."""
    analytics_id = (config.get("configurable") or {}).get("analytics_id")
    if analytics_id is None:
        return []
    data = _graphql_post(_MENU_HEATMAPS_QUERY, {"analyticsRunId": str(analytics_id)})
    return data.get("menuHeatmaps") or []


@tool
def get_menu_engineering_matrix(
    config: RunnableConfig,
    categories: Optional[list[str]] = None,
) -> dict:
    """Fetches the menu engineering BCG matrix for the current analytics run. Returns item-level classification (star, puzzle, plow_horse, low_end), portfolio thresholds, and recommended actions. Requires COGS to be configured. Optionally pass categories to filter items to a specific quadrant."""
    analytics_id = (config.get("configurable") or {}).get("analytics_id")
    if analytics_id is None:
        return {}
    data = _graphql_post(
        _MENU_ENGINEERING_MATRIX_QUERY,
        {
            "analyticsRunId": str(analytics_id),
            "categories": categories,
        },
    )
    return data.get("menuEngineeringMatrix") or {}
