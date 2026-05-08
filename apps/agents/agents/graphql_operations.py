"""Shared GraphQL operation documents and list limits for the agents HTTP client.

Keep ``DEFAULT_NODES_FIRST`` aligned with ``MAX_NODES_FIRST`` in ``apps/graphql/limits.py``.
"""

from __future__ import annotations

# Must match apps/graphql/limits.py MAX_NODES_FIRST (and DEFAULT_NODES_FIRST there).
DEFAULT_NODES_FIRST = 500

NODES_QUERY = """
query Nodes($locationId: Int!, $nodeType: String, $parentId: ID, $first: Int, $afterId: ID) {
  nodes(locationId: $locationId, nodeType: $nodeType, parentId: $parentId, first: $first, afterId: $afterId) {
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
    milestoneGoal
    milestoneInput
    passCriterias
    milestonePresetData
    milestoneResult
  }
}
"""

UPDATE_NODE_MUTATION = """
mutation UpdateNode($id: ID!, $data: JSON) {
  updateNode(id: $id, data: $data) {
    id
    nodeType
    data
    milestoneGoal
    milestoneInput
    passCriterias
    milestonePresetData
    milestoneResult
  }
}
"""

SET_PASS_CRITERION_STATUS_MUTATION = """
mutation SetPassCriterionStatus(
  $milestoneId: ID!
  $locationId: Int!
  $criterionId: String!
  $status: String!
) {
  setPassCriterionStatus(
    milestoneId: $milestoneId
    locationId: $locationId
    criterionId: $criterionId
    status: $status
  )
}
"""

REPLACE_PASS_CRITERIA_MUTATION = """
mutation ReplacePassCriteria($milestoneId: ID!, $locationId: Int!, $requirements: [String!]!) {
  replacePassCriteria(milestoneId: $milestoneId, locationId: $locationId, requirements: $requirements)
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
    manualBriefInput {
      locationId
      quickProfile
    }
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

PROMOTION_ENGINEERING_CANDIDATES_QUERY = """
query PromotionEngineeringCandidates($locationId: ID!, $analyticsRunId: ID!) {
  promotionEngineeringCandidates(locationId: $locationId, analyticsRunId: $analyticsRunId)
}
"""

LOCATION_OPERATING_SIGNALS_QUERY = """
query LocationOperatingSignals($locationId: ID!, $analyticsRunId: ID!) {
  instagramSignals(analyticsRunId: $analyticsRunId, locationId: $locationId) {
    capabilities {
      hasOrderId
      hasDatetime
      enabledBlocks
    }
    fundamentalSignals {
      sales {
        totalItemsSold
        totalRevenue
        uniqueMenuItems
        avgItemPrice
        avgPopularityThreshold
      }
      categoryFocus {
        category
        revenueShare
        quantityShare
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
    }
    additionalSignals {
      orderSignals {
        totalOrders
        avgOrderRevenue
        maxOrderRevenue
        minOrderRevenue
        avgOrderItems
        maxOrderItems
        minOrderItems
      }
      datetimeSignals {
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
      matrixSignals {
        contentHeroes {
          menu
          matrixCategory
          totalRevenue
        }
        avoidItems {
          menu
          matrixCategory
          totalRevenue
        }
      }
      campaignPlanningSignals {
        recommendedPostingDays
        recommendedDayparts
        objectiveRecommendation
        primaryCtaChannel
      }
      signalConfidence {
        tier
        coverageNotes
      }
    }
  }
}
"""

CAMPAIGN_SCHEDULE_PLAN_QUERY = """
query CampaignSchedulePlan(
  $workflowId: ID!
  $milestoneId: ID!
  $locationId: Int!
) {
  campaignSchedulePlan(
    workflowId: $workflowId
    milestoneId: $milestoneId
    locationId: $locationId
  ) {
    analyticsRunId
    campaignStart
    campaignEnd
    timezone
    postsPerWeek
    sourceSignalsSummary
    slots {
      dateTime
      postType
      promotedMenuItems
      visualIdea
      captionIdea
    }
  }
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
