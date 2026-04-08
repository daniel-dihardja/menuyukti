"""GraphQL: analytics runs, operating profile, public holidays (skill prefetch)."""

from __future__ import annotations

import json
from typing import Any

import httpx
from agents_app.agents.graphql_base import graphql_post

_ANALYTICS_RUNS_QUERY = """
query AnalyticsRunsByLocation($locationId: Int!) {
  analyticsRuns(locationId: $locationId) {
    id
    name
    filename
  }
}
"""

_LOCATION_QUERY = """
query GetLocation($id: ID!) {
  location(id: $id) {
    id
    name
    street
    city
    country
    currency
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


async def fetch_latest_analytics_run_id(
    location_id: int,
    user_id: str,
    *,
    client: httpx.AsyncClient,
) -> str | None:
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


async def fetch_location_dict(
    location_id: int,
    user_id: str,
    *,
    client: httpx.AsyncClient,
) -> dict[str, Any] | None:
    """Load location row fields (name, address, currency) from GraphQL."""
    data = await graphql_post(
        client,
        _LOCATION_QUERY,
        {"id": str(location_id)},
        user_id,
    )
    raw = data.get("location")
    if raw is None:
        return None
    if not isinstance(raw, dict):
        return None
    return json.loads(json.dumps(raw))


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
        _PUBLIC_HOLIDAYS_QUERY,
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
    return json.loads(json.dumps(raw))


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
    return json.loads(json.dumps(raw))


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
    return json.loads(json.dumps(raw))


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
    return json.loads(json.dumps(raw))


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
    return json.loads(json.dumps(raw))


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
    return json.loads(json.dumps(raw))
