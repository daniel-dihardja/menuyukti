"""Shared GraphQL operation documents and list limits for the agents HTTP client.

Keep ``DEFAULT_NODES_FIRST`` aligned with ``MAX_NODES_FIRST`` in ``apps/graphql/limits.py``.
"""

from __future__ import annotations

# Must match apps/graphql/limits.py MAX_NODES_FIRST (and DEFAULT_NODES_FIRST there).
DEFAULT_NODES_FIRST = 500

NODES_QUERY = """
query Nodes($locationId: Int!, $nodeType: String, $parentId: ID, $first: Int) {
  nodes(locationId: $locationId, nodeType: $nodeType, parentId: $parentId, first: $first) {
    id
    name
    nodeType
    parentId
    locationId
    data
  }
}
"""

NODE_BY_ID_QUERY = """
query Node($id: ID!) {
  node(id: $id) {
    id
    name
    nodeType
    parentId
    locationId
    data
  }
}
"""

UPDATE_NODE_MUTATION = """
mutation UpdateNode($id: ID!, $data: JSON) {
  updateNode(id: $id, data: $data) {
    id
    nodeType
    data
  }
}
"""

DELETE_NODE_MUTATION = """
mutation DeleteNode($id: ID!) {
  deleteNode(id: $id)
}
"""

CREATE_NODE_MUTATION = """
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

LOCATION_QUERY = """
query GetLocation($id: ID!) {
  location(id: $id) {
    id
    name
    street
    city
    country
    currency
    workspaceId
  }
}
"""

LOCATIONS_QUERY = """
query LocationsForPrefetch {
  locations {
    id
    name
    street
    city
    country
    currency
  }
}
"""

API_ADAPTER_TOOLS_QUERY = """
query ApiAdapterToolsForRun($workspaceId: ID!) {
  apiAdapterTools(workspaceId: $workspaceId) {
    toolKey
    name
    description
    url
    isActive
  }
}
"""

PUBLIC_HOLIDAYS_QUERY = """
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

PRIOR_MILESTONES_MILESTONE_DATA_QUERY = """
query PriorMilestonesMilestoneData(
  $workflowId: ID!
  $milestoneId: ID!
  $locationId: Int!
) {
  priorMilestonesMilestoneData(
    workflowId: $workflowId
    milestoneId: $milestoneId
    locationId: $locationId
  )
}
"""

ANALYTICS_RUNS_QUERY = """
query AnalyticsRunsForLocation($locationId: Int!, $first: Int) {
  analyticsRuns(locationId: $locationId, first: $first) {
    id
    name
  }
}
"""

LOCATION_OPERATING_SIGNALS_QUERY = """
query LocationOperatingSignals($locationId: ID!, $analyticsRunId: ID!) {
  operatingProfile(locationId: $locationId, analyticsRunId: $analyticsRunId) {
    totalOrders
    totalRevenue
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
    }
    dayOfWeekBreakdown {
      day
      isWeekend
      orderCount
      share
      isPeakDay
    }
  }
  categoryMix(analyticsRunId: $analyticsRunId, locationId: $locationId) {
    topRevenueCategory
    rows {
      category
      revenueShare
      quantityShare
      topItem
    }
  }
  promotionMenuItems(analyticsRunId: $analyticsRunId, locationId: $locationId) {
    periodStart
    periodEnd
    itemsTotalCount
    itemsTruncated
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
  instagramSignals(analyticsRunId: $analyticsRunId, locationId: $locationId) {
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

REPLACE_PASS_CRITERIA_MUTATION = """
mutation ReplacePassCriteria(
  $milestoneId: ID!
  $locationId: Int!
  $requirements: [String!]!
) {
  replacePassCriteria(
    milestoneId: $milestoneId
    locationId: $locationId
    requirements: $requirements
  )
}
"""

START_MILESTONE_AGENT_RUN_MUTATION = """
mutation StartMilestoneAgentRun(
  $runId: String!
  $milestoneId: ID!
  $workflowId: ID
  $traceparent: String
) {
  startMilestoneAgentRun(
    runId: $runId
    milestoneId: $milestoneId
    workflowId: $workflowId
    traceparent: $traceparent
  )
}
"""

COMPLETE_MILESTONE_AGENT_RUN_MUTATION = """
mutation CompleteMilestoneAgentRun(
  $runId: String!
  $status: String!
  $summary: JSON
  $externalTraceId: String
  $externalTraceUrl: String
  $timeline: JSON
  $errorMessage: String
) {
  completeMilestoneAgentRun(
    runId: $runId
    status: $status
    summary: $summary
    externalTraceId: $externalTraceId
    externalTraceUrl: $externalTraceUrl
    timeline: $timeline
    errorMessage: $errorMessage
  )
}
"""
