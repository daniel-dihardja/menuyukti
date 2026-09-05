"""Shared GraphQL operation documents for the agents HTTP client."""

from __future__ import annotations

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

INVENTORY_REFILL_FORECAST_QUERY = """
query InventoryRefillForecast($locationId: ID!, $windowDays: Int) {
  inventoryRefillForecast(locationId: $locationId, windowDays: $windowDays) {
    catalogItemId
    name
    storageZone
    onHand
    minOnHand
    avgDailyOut
    daysUntilRefill
    priorityRank
    confidence
    windowDays
  }
}
"""
