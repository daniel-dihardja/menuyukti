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

MEDIA_COLLECTIONS_QUERY = """
query MediaCollections {
  mediaCollections {
    id
    workspaceId
    name
    createdByClerkUserId
    memberCount
  }
}
"""

MEDIA_ASSETS_QUERY = """
query MediaAssets($collectionId: Int) {
  mediaAssets(collectionId: $collectionId) {
    id
    workspaceId
    filename
    displayName
    createdByClerkUserId
  }
}
"""
