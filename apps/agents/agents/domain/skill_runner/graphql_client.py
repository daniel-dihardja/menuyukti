"""GraphQL: analytics runs, operating profile (skill prefetch)."""

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
