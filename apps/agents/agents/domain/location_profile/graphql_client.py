"""GraphQL: analytics runs, operating profile, milestonedata upsert."""

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

_NODES_QUERY = """
query Nodes($locationId: Int!, $nodeType: String, $parentId: ID) {
  nodes(locationId: $locationId, nodeType: $nodeType, parentId: $parentId) {
    id
    nodeType
    data
  }
}
"""

_UPDATE_NODE_MUTATION = """
mutation UpdateNode($id: ID!, $data: JSON) {
  updateNode(id: $id, data: $data) {
    id
    nodeType
    data
  }
}
"""

_DELETE_NODE_MUTATION = """
mutation DeleteNode($id: ID!) {
  deleteNode(id: $id)
}
"""

_CREATE_NODE_MUTATION = """
mutation CreateNode(
  $locationId: Int!
  $nodeType: String!
  $name: String
  $description: String
  $data: JSON
  $parentId: ID
) {
  createNode(
    locationId: $locationId
    nodeType: $nodeType
    name: $name
    description: $description
    data: $data
    parentId: $parentId
  ) {
    id
    nodeType
    data
    parentId
    locationId
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


async def upsert_milestonedata(
    milestone_id: str,
    location_id: int,
    text: str,
    user_id: str,
    *,
    client: httpx.AsyncClient,
) -> dict[str, Any]:
    """Create or update the single `milestonedata` child under the milestone."""

    data = await graphql_post(
        client,
        _NODES_QUERY,
        {
            "locationId": location_id,
            "nodeType": "milestonedata",
            "parentId": milestone_id,
        },
        user_id,
    )
    raw_nodes = data.get("nodes")
    rows: list[dict[str, Any]] = []
    if isinstance(raw_nodes, list):
        for item in raw_nodes:
            if isinstance(item, dict) and str(item.get("nodeType", "")) == "milestonedata":
                rows.append(item)

    if not rows:
        gql = await graphql_post(
            client,
            _CREATE_NODE_MUTATION,
            {
                "locationId": location_id,
                "nodeType": "milestonedata",
                "parentId": milestone_id,
                "name": "Data",
                "data": {"data": text},
            },
            user_id,
        )
        node = gql.get("createNode")
        if not isinstance(node, dict):
            msg = "createNode returned invalid payload"
            raise RuntimeError(msg)
        return node

    primary, *rest = rows
    for extra in rest:
        eid = extra.get("id")
        if eid is not None:
            await graphql_post(client, _DELETE_NODE_MUTATION, {"id": str(eid)}, user_id)

    pid = primary.get("id")
    if pid is None:
        msg = "milestonedata node missing id"
        raise RuntimeError(msg)
    upd = await graphql_post(
        client,
        _UPDATE_NODE_MUTATION,
        {"id": str(pid), "data": {"data": text}},
        user_id,
    )
    node = upd.get("updateNode")
    if not isinstance(node, dict):
        msg = "updateNode returned invalid payload"
        raise RuntimeError(msg)
    return node
