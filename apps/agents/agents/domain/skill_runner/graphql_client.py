"""GraphQL: analytics runs, operating profile, public holidays (skill prefetch)."""

from __future__ import annotations

from copy import deepcopy
from typing import Any

import httpx
from agents_app.agents.graphql_base import graphql_post
from agents_app.agents.graphql_operations import (
    LOCATION_QUERY,
    LOCATIONS_QUERY,
    PUBLIC_HOLIDAYS_QUERY,
)

_ANALYTICS_RUNS_QUERY = """
query AnalyticsRunsByLocation($locationId: Int!) {
  analyticsRuns(locationId: $locationId) {
    id
    name
    filename
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

_INSTAGRAM_SIGNALS_QUERY = """
query InstagramSignals($analyticsRunId: ID!, $locationId: ID!) {
  instagramSignals(analyticsRunId: $analyticsRunId, locationId: $locationId) {
    analyticsRunId
    periodStart
    periodEnd
    contentHeroes {
      menu
      matrixCategory
      totalRevenue
      menuCategory
      menuCategoryDetail
    }
    trendingItems {
      menu
      currentRevenue
      previousRevenue
      changePct
      rankCurrent
      rankPrevious
      trendLabel
    }
    avoidItems {
      menu
      matrixCategory
      totalRevenue
      menuCategory
      menuCategoryDetail
    }
    categoryFocus {
      category
      revenueShare
      quantityShare
    }
    bestPostingWindow {
      peakDay
      peakRevenueDay
      primaryMealPeriod
      peakRevenueMealPeriod
      peakHour
    }
    periodHeadline {
      periodStart
      periodEnd
      totalRevenue
      previousPeriodTotalRevenue
      revenueVsPreviousPct
    }
  }
}
"""

_PROMOTION_MENU_ITEMS_QUERY = """
query PromotionMenuItems($analyticsRunId: ID!, $locationId: ID!) {
  promotionMenuItems(analyticsRunId: $analyticsRunId, locationId: $locationId) {
    analyticsRunId
    periodStart
    periodEnd
    items {
      menu
      quantity
      totalRevenue
      menuCategory
      menuCategoryDetail
      cogs
      totalCogs
      contributionMargin
      contributionMarginPercentage
      marginPerUnit
      weValue
      category
      action
      peakHour
      peakDay
    }
  }
}
"""

_CATEGORY_MIX_QUERY = """
query CategoryMix($analyticsRunId: ID!, $locationId: ID!) {
  categoryMix(analyticsRunId: $analyticsRunId, locationId: $locationId) {
    analyticsRunId
    topRevenueCategory
    rows {
      category
      revenue
      quantity
      revenueShare
      quantityShare
      topItem
    }
  }
}
"""

_REVENUE_TRENDS_QUERY = """
query RevenueTrends($analyticsRunId: ID!, $locationId: ID!) {
  revenueTrends(analyticsRunId: $analyticsRunId, locationId: $locationId) {
    analyticsRunId
    currentPeriodTotalRevenue
    previousPeriodTotalRevenue
    rows {
      menu
      currentRevenue
      previousRevenue
      changePct
      rankCurrent
      rankPrevious
      trendLabel
    }
  }
}
"""

_MENU_ITEMS_CATALOG_QUERY = """
query MenuItemsCatalog($locationId: Int!) {
  menuItemsCatalog(locationId: $locationId) {
    analyticsRunId
    items {
      id
      name
      category
      categoryDetail
      price
      description
      isActive
    }
  }
}
"""

_WEEKLY_DEMAND_PATTERN_QUERY = """
query WeeklyDemandPattern($locationId: Int!) {
  weeklyDemandPattern(locationId: $locationId) {
    analyticsRunId
    rows {
      isoWeek
      weekLabel
      revenueIndex
      txIndex
      relativeDemand
    }
  }
}
"""

_LOCATION_SOCIAL_SETTINGS_QUERY = """
query LocationSocialSettings($locationId: Int!) {
  locationSocialSettings(locationId: $locationId) {
    locationId
    tone
    brandPersonality
    contentPillars
    platformFocus
    brandHashtags
    avoidTopics
    targetAudience
  }
}
"""

_MOST_RECENT_MILESTONE_DATA_QUERY = """
query MostRecentMilestoneData($workflowId: ID!, $dataTask: String!) {
  mostRecentMilestoneData(workflowId: $workflowId, dataTask: $dataTask)
}
"""


async def fetch_latest_analytics_run_id(
    location_id: int,
    user_id: str,
    *,
    client: httpx.AsyncClient,
) -> str | None:
    """Return the newest analytics run id for the location (server orders by id desc)."""
    data = await graphql_post(
        client,
        _ANALYTICS_RUNS_QUERY,
        {"locationId": location_id},
        user_id,
    )
    raw = data.get("analyticsRuns")
    if not isinstance(raw, list) or not raw:
        return None
    first = raw[0]
    if not isinstance(first, dict):
        return None
    rid = first.get("id")
    return str(rid) if rid is not None else None


async def get_or_fetch_latest_analytics_run_id(
    location_id: int,
    user_id: str,
    *,
    client: httpx.AsyncClient,
    prefetch_cache: dict[int, str | None] | None = None,
) -> str | None:
    """Like :func:`fetch_latest_analytics_run_id` but reuses one result per location per prefetch run."""
    if prefetch_cache is not None and location_id in prefetch_cache:
        return prefetch_cache[location_id]
    rid = await fetch_latest_analytics_run_id(location_id, user_id, client=client)
    if prefetch_cache is not None:
        prefetch_cache[location_id] = rid
    return rid


async def fetch_location_dict(
    location_id: int,
    user_id: str,
    *,
    client: httpx.AsyncClient,
) -> dict[str, Any] | None:
    """Load location row fields (name, address, currency) from GraphQL.

    Uses ``location(id)`` first; if that returns null (edge cases), falls back to scanning ``locations``.
    """
    data = await graphql_post(
        client,
        LOCATION_QUERY,
        {"id": str(location_id)},
        user_id,
    )
    raw = data.get("location")
    if isinstance(raw, dict):
        return deepcopy(raw)
    data2 = await graphql_post(
        client,
        LOCATIONS_QUERY,
        {},
        user_id,
    )
    rows = data2.get("locations")
    if not isinstance(rows, list):
        return None
    target = str(location_id)
    for row in rows:
        if not isinstance(row, dict):
            continue
        rid = row.get("id")
        if rid is not None and str(rid) == target:
            return deepcopy(row)
    return None


async def fetch_public_holidays_list(
    country: str,
    start_date: str,
    end_date: str,
    user_id: str,
    *,
    client: httpx.AsyncClient,
) -> list[dict[str, Any]]:
    """Load public holidays for a country and inclusive date range (YYYY-MM-DD strings) from GraphQL."""
    data = await graphql_post(
        client,
        PUBLIC_HOLIDAYS_QUERY,
        {
            "country": country,
            "startDate": start_date,
            "endDate": end_date,
        },
        user_id,
    )
    raw = data.get("publicHolidays")
    if raw is None:
        return []
    if not isinstance(raw, list):
        return []
    return deepcopy(raw)


async def fetch_operating_profile_dict(
    location_id: int,
    analytics_run_id: str,
    user_id: str,
    *,
    client: httpx.AsyncClient,
) -> dict[str, Any] | None:
    data = await graphql_post(
        client,
        _OPERATING_PROFILE_QUERY,
        {
            "locationId": str(location_id),
            "analyticsRunId": str(analytics_run_id),
        },
        user_id,
    )
    raw = data.get("operatingProfile")
    if raw is None:
        return None
    if not isinstance(raw, dict):
        return None
    return deepcopy(raw)


async def fetch_instagram_signals_dict(
    location_id: int,
    analytics_run_id: str,
    user_id: str,
    *,
    client: httpx.AsyncClient,
) -> dict[str, Any] | None:
    """Load composite Instagram signals for an analytics run (camelCase JSON keys)."""
    data = await graphql_post(
        client,
        _INSTAGRAM_SIGNALS_QUERY,
        {
            "analyticsRunId": str(analytics_run_id),
            "locationId": str(location_id),
        },
        user_id,
    )
    raw = data.get("instagramSignals")
    if raw is None:
        return None
    if not isinstance(raw, dict):
        return None
    return deepcopy(raw)


async def fetch_promotion_menu_items_dict(
    location_id: int,
    analytics_run_id: str,
    user_id: str,
    *,
    client: httpx.AsyncClient,
) -> dict[str, Any] | None:
    """Load promotion menu items payload (camelCase JSON keys)."""
    data = await graphql_post(
        client,
        _PROMOTION_MENU_ITEMS_QUERY,
        {
            "analyticsRunId": str(analytics_run_id),
            "locationId": str(location_id),
        },
        user_id,
    )
    raw = data.get("promotionMenuItems")
    if raw is None:
        return None
    if not isinstance(raw, dict):
        return None
    return deepcopy(raw)


async def fetch_category_mix_dict(
    location_id: int,
    analytics_run_id: str,
    user_id: str,
    *,
    client: httpx.AsyncClient,
) -> dict[str, Any] | None:
    """Load category mix for an analytics run."""
    data = await graphql_post(
        client,
        _CATEGORY_MIX_QUERY,
        {
            "analyticsRunId": str(analytics_run_id),
            "locationId": str(location_id),
        },
        user_id,
    )
    raw = data.get("categoryMix")
    if raw is None:
        return None
    if not isinstance(raw, dict):
        return None
    return deepcopy(raw)


async def fetch_revenue_trends_dict(
    location_id: int,
    analytics_run_id: str,
    user_id: str,
    *,
    client: httpx.AsyncClient,
) -> dict[str, Any] | None:
    """Load revenue trends vs the prior period for an analytics run."""
    data = await graphql_post(
        client,
        _REVENUE_TRENDS_QUERY,
        {
            "analyticsRunId": str(analytics_run_id),
            "locationId": str(location_id),
        },
        user_id,
    )
    raw = data.get("revenueTrends")
    if raw is None:
        return None
    if not isinstance(raw, dict):
        return None
    return deepcopy(raw)


async def fetch_menu_items_catalog_dict(
    location_id: int,
    user_id: str,
    *,
    client: httpx.AsyncClient,
) -> dict[str, Any] | None:
    """Full menu catalog from latest analytics run (camelCase JSON keys)."""
    data = await graphql_post(
        client,
        _MENU_ITEMS_CATALOG_QUERY,
        {"locationId": location_id},
        user_id,
    )
    raw = data.get("menuItemsCatalog")
    if raw is None:
        return None
    if not isinstance(raw, dict):
        return None
    return deepcopy(raw)


async def fetch_weekly_demand_pattern_dict(
    location_id: int,
    user_id: str,
    *,
    client: httpx.AsyncClient,
) -> dict[str, Any] | None:
    """Week-level demand indices for the latest analytics run."""
    data = await graphql_post(
        client,
        _WEEKLY_DEMAND_PATTERN_QUERY,
        {"locationId": location_id},
        user_id,
    )
    raw = data.get("weeklyDemandPattern")
    if raw is None:
        return None
    if not isinstance(raw, dict):
        return None
    return deepcopy(raw)


async def fetch_location_social_settings_dict(
    location_id: int,
    user_id: str,
    *,
    client: httpx.AsyncClient,
) -> dict[str, Any] | None:
    """Brand voice / hashtag defaults for a location."""
    data = await graphql_post(
        client,
        _LOCATION_SOCIAL_SETTINGS_QUERY,
        {"locationId": location_id},
        user_id,
    )
    raw = data.get("locationSocialSettings")
    if raw is None:
        return None
    if not isinstance(raw, dict):
        return None
    return deepcopy(raw)


async def fetch_most_recent_milestone_data_str(
    workflow_id: str,
    data_task: str,
    user_id: str,
    *,
    client: httpx.AsyncClient,
) -> str | None:
    """Markdown from the most recent milestone with matching dataTask under the workflow."""
    data = await graphql_post(
        client,
        _MOST_RECENT_MILESTONE_DATA_QUERY,
        {"workflowId": str(workflow_id), "dataTask": data_task},
        user_id,
    )
    raw = data.get("mostRecentMilestoneData")
    if raw is None:
        return None
    if not isinstance(raw, str) or not raw.strip():
        return None
    return raw
