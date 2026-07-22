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

MILESTONE_INPUT_QUERY = """
query MilestoneInput($id: ID!) {
  node(id: $id) {
    id
    nodeType
    locationId
    parentId
    milestoneInput
  }
}
"""

MILESTONE_PRESET_DATA_QUERY = """
query MilestonePresetData($id: ID!) {
  node(id: $id) {
    id
    name
    nodeType
    locationId
    parentId
    milestonePresetData
  }
}
"""

MILESTONE_HELP_QUERY = """
query MilestoneHelp($id: ID!) {
  node(id: $id) {
    id
    nodeType
    locationId
    parentId
    name
    milestoneGoal
    data
    passCriterias
  }
}
"""

WORKFLOW_CAMPAIGN_TREE_QUERY = """
query WorkflowCampaignTree($workflowId: ID!) {
  workflowCampaignTree(workflowId: $workflowId) {
    workflow {
      id
      name
      locationId
    }
    milestones {
      milestone {
        id
        name
        milestoneGoal
        data
      }
    }
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

SET_PASS_CRITERIA_STATUSES_MUTATION = """
mutation SetPassCriteriaStatuses(
  $milestoneId: ID!
  $locationId: Int!
  $updates: [PassCriterionStatusInput!]!
) {
  setPassCriteriaStatuses(
    milestoneId: $milestoneId
    locationId: $locationId
    updates: $updates
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
    openingHours {
      dayOfWeek
      openTime
      closeTime
    }
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

ORDER_METRICS_SLOT_DEMAND_QUERY = """
query OrderMetricsSlotDemand($analyticsRunId: ID!) {
  orderMetrics(analyticsRunId: $analyticsRunId) {
    slotDemandProfile {
      day
      mealPeriod
      mealPeriodLabel
      mealPeriodHoursLabel
      orderCount
      trafficShare
      demandIndex
      relativeDemand
    }
  }
}
"""

MENU_HEATMAPS_CHAT_QUERY = """
query MenuHeatmapsForChat($id: ID!, $locationId: ID) {
  menuHeatmaps(analyticsRunId: $id, locationId: $locationId) {
    menu
    menuCategory
    menuCategoryDetail
    reportingPeriod
    dailyHeatmap { hour quantity }
    weeklyHeatmap { day quantity }
  }
}
"""

MENU_COMBOS_LIFT_MATRIX_CHAT_QUERY = """
query MenuCombosLiftMatrixForChat($id: ID!, $locationId: ID) {
  menuCombos(analyticsRunId: $id, locationId: $locationId) {
    focusMenus
    matrixLift
    totalOrders
    multiItemOrderCount
    scope
  }
}
"""

LATEST_ANALYTICS_RUN_WITH_SIGNALS_QUERY = """
query LatestAnalyticsRunWithSignals($locationId: Int!) {
  latestAnalyticsRunWithSignals(locationId: $locationId) {
    analyticsRun {
      id
      name
    }
    instagramSignals {
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
}
"""

PROMOTION_ENGINEERING_CANDIDATES_QUERY = """
query PromotionEngineeringCandidates(
  $locationId: ID!
  $analyticsRunId: ID!
  $maxStarItems: Int
  $maxPuzzleItems: Int
) {
  promotionEngineeringCandidates(
    locationId: $locationId
    analyticsRunId: $analyticsRunId
    maxStarItems: $maxStarItems
    maxPuzzleItems: $maxPuzzleItems
  )
}
"""

MENU_ENGINEERING_MATRIX_QUERY = """
query MenuEngineeringMatrix(
  $analyticsRunId: ID!
  $locationId: ID
  $categories: [String!]
) {
  menuEngineeringMatrix(
    analyticsRunId: $analyticsRunId
    locationId: $locationId
    categories: $categories
  ) {
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
      contributionMargin
      contributionMarginPercentage
      weValue
      category
      action
      menuCategory
      menuCategoryDetail
    }
  }
}
"""

SLOT_MENU_CANDIDATES_QUERY = """
query SlotMenuCandidates(
  $analyticsRunId: ID!
  $locationId: ID
  $options: SlotMenuCandidatesOptionsInput
) {
  slotMenuCandidates(
    analyticsRunId: $analyticsRunId
    locationId: $locationId
    options: $options
  ) {
    reportingPeriod
    matrixAvailable
    coverageNotes
    slots {
      day
      mealPeriod
      mealPeriodLabel
      mealPeriodHoursLabel
      orderCount
      demandIndex
      relativeDemand
      posture
      recommendedCategories
      totalItemQuantity
      insufficientData
      candidates {
        menu
        globalCategory
        globalAction
        slotQuantity
        slotShare
        slotAffinity
        recommendedUse
        rank
        score
        menuCategory
      }
    }
  }
}
"""

IG_PLAN_INPUTS_QUERY = """
query IgPlanInputs($locationId: Int!, $analyticsRunId: ID, $options: IgPlanInputsOptionsInput) {
  igPlanInputs(locationId: $locationId, analyticsRunId: $analyticsRunId, options: $options) {
    version
    coverageNotes
    location {
      id
      name
      street
      city
      country
      currency
      openingHours {
        dayOfWeek
        openTime
        closeTime
      }
      manualBriefInput {
        locationId
        quickProfile
      }
    }
    analyticsRun {
      id
      name
    }
    slotDemandProfile {
      day
      mealPeriod
      mealPeriodLabel
      mealPeriodHoursLabel
      orderCount
      trafficShare
      demandIndex
      relativeDemand
    }
    menuEngineeringMatrix {
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
        contributionMargin
        contributionMarginPercentage
        weValue
        category
        action
        menuCategory
        menuCategoryDetail
      }
    }
    slotMenuCandidates {
      reportingPeriod
      matrixAvailable
      coverageNotes
      slots {
        day
        mealPeriod
        mealPeriodLabel
        mealPeriodHoursLabel
        orderCount
        demandIndex
        relativeDemand
        posture
        recommendedCategories
        totalItemQuantity
        insufficientData
        candidates {
          menu
          globalCategory
          globalAction
          slotQuantity
          slotShare
          slotAffinity
          recommendedUse
          rank
          score
          menuCategory
        }
      }
    }
  }
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

INSTAGRAM_ITEM_FIELDS = """
  id
  workflowId
  locationId
  kind
  title
  caption
  hook
  visualBrief
  mediaS3Key
  generationPrompt
  referenceImages {
    name
    enabled
  }
  status
  schedule
  createdAt
  updatedAt
"""

INSTAGRAM_ITEMS_QUERY = """
query InstagramItems($workflowId: ID!) {
  instagramItems(workflowId: $workflowId) {
""" + INSTAGRAM_ITEM_FIELDS + """
  }
}
"""

CREATE_INSTAGRAM_ITEM_MUTATION = """
mutation CreateInstagramItem(
  $workflowId: ID!
  $kind: String!
  $title: String
  $caption: String
  $hook: String
  $visualBrief: String
  $status: String
  $schedule: DateTime
) {
  createInstagramItem(
    workflowId: $workflowId
    kind: $kind
    title: $title
    caption: $caption
    hook: $hook
    visualBrief: $visualBrief
    status: $status
    schedule: $schedule
  ) {
""" + INSTAGRAM_ITEM_FIELDS + """
  }
}
"""

UPDATE_INSTAGRAM_ITEM_MUTATION = """
mutation UpdateInstagramItem(
  $id: ID!
  $kind: String
  $title: String
  $caption: String
  $hook: String
  $visualBrief: String
  $mediaS3Key: String
  $generationPrompt: String
  $referenceImages: [InstagramItemReferenceImageInput!]
  $status: String
  $schedule: DateTime
) {
  updateInstagramItem(
    id: $id
    kind: $kind
    title: $title
    caption: $caption
    hook: $hook
    visualBrief: $visualBrief
    mediaS3Key: $mediaS3Key
    generationPrompt: $generationPrompt
    referenceImages: $referenceImages
    status: $status
    schedule: $schedule
  ) {
""" + INSTAGRAM_ITEM_FIELDS + """
  }
}
"""

DELETE_INSTAGRAM_ITEM_MUTATION = """
mutation DeleteInstagramItem($id: ID!) {
  deleteInstagramItem(id: $id)
}
"""
