export const ANALYTICS_RUNS_BY_LOCATION_QUERY = `
  query AnalyticsRunsByLocation($locationId: Int!, $first: Int) {
    analyticsRuns(locationId: $locationId, first: $first) {
      id
      name
      filename
    }
  }
`

export type AnalyticsRunsByLocationData = {
  analyticsRuns: Array<{ id: string; name: string; filename: string }>
}

/** Run metadata only; omits `menuItemCogs` so the GraphQL resolver skips the COGS query. */
export const ANALYTICS_RUN_METADATA_QUERY = `
  query AnalyticsRunMetadata($id: ID!) {
    analyticsRun(id: $id) {
      id
      name
      filename
      posSystem
      periodStart
      periodEnd
      createdAt
      locationId
    }
  }
`

export type AnalyticsRunMetadataData = {
  analyticsRun: {
    id: string
    name: string
    filename: string
    posSystem: string
    periodStart: string | null
    periodEnd: string | null
    createdAt: string
    locationId: number
  } | null
}

export const ANALYTICS_RUN_QUERY = `
  query AnalyticsRun($id: ID!) {
    analyticsRun(id: $id) {
      id
      name
      filename
      posSystem
      periodStart
      periodEnd
      createdAt
      locationId
      menuItemCogs {
        id
        analyticsRunId
        menu
        menuCategory
        menuCategoryDetail
        cogs
        currency
      }
    }
  }
`

export type AnalyticsRunData = {
  analyticsRun: {
    id: string
    name: string
    filename: string
    posSystem: string
    periodStart: string | null
    periodEnd: string | null
    createdAt: string
    locationId: number
    menuItemCogs: Array<{
      id: number
      analyticsRunId: number
      menu: string
      menuCategory: string | null
      menuCategoryDetail: string | null
      cogs: number
      currency: string | null
    }>
  } | null
}

export const MENU_ENGINEERING_MATRIX_QUERY = `
  query MenuEngineeringMatrix($id: ID!, $categories: [String!], $locationId: ID) {
    menuEngineeringMatrix(analyticsRunId: $id, categories: $categories, locationId: $locationId) {
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
`

export type MenuEngineeringMatrixData = {
  menuEngineeringMatrix: {
    thresholds: {
      avgPopularity: number
      avgContributionMargin: number
      totalCogs: number
      totalProfit: number
      totalMargin: number
    }
    distribution: Array<{
      category: string
      itemCount: number
      itemShare: number
      marginShare: number
    }>
    items: Array<{
      menu: string
      quantity: number
      totalRevenue: number
      cogs: number
      totalCogs: number
      contributionMargin: number
      contributionMarginPercentage: number
      marginPerUnit: number
      weValue: number
      category: string
      action: string
      menuCategory: string | null
      menuCategoryDetail: string | null
    }>
  } | null
}

export const MENU_ITEMS_CATALOG_QUERY = `
  query MenuItemsCatalog($locationId: Int!) {
    menuItemsCatalog(locationId: $locationId) {
      analyticsRunId
      items {
        id
        name
        category
        categoryDetail
        price
        quantity
        isActive
      }
    }
  }
`

export type MenuItemsCatalogData = {
  menuItemsCatalog: {
    analyticsRunId: string
    items: Array<{
      id: string
      name: string
      category: string
      categoryDetail: string | null
      price: number
      quantity: number
      isActive: boolean
    }>
  } | null
}

export const MENU_ITEMS_CATALOG_FOR_RUN_QUERY = `
  query MenuItemsCatalogForRun($analyticsRunId: ID!) {
    menuItemsCatalogForRun(analyticsRunId: $analyticsRunId) {
      analyticsRunId
      items {
        id
        name
        category
        categoryDetail
        price
        quantity
        isActive
      }
    }
  }
`

export type MenuItemsCatalogForRunData = {
  menuItemsCatalogForRun: {
    analyticsRunId: string
    items: Array<{
      id: string
      name: string
      category: string
      categoryDetail: string | null
      price: number
      quantity: number
      isActive: boolean
    }>
  } | null
}

export const MENU_HEATMAPS_QUERY = `
  query MenuHeatmaps($id: ID!, $locationId: ID) {
    menuHeatmaps(analyticsRunId: $id, locationId: $locationId) {
      menu
      menuCategory
      menuCategoryDetail
      reportingPeriod
      dailyHeatmap { hour quantity }
      weeklyHeatmap { day quantity }
    }
  }
`

export type MenuHeatmapsData = {
  menuHeatmaps: Array<{
    menu: string
    menuCategory: string | null
    menuCategoryDetail: string | null
    reportingPeriod: string
    dailyHeatmap: Array<{ hour: number; quantity: number }>
    weeklyHeatmap: Array<{ day: string; quantity: number }>
  }>
}

export const PROMOTION_MENU_ITEMS_QUERY = `
  query PromotionMenuItems($id: ID!, $locationId: ID) {
    promotionMenuItems(analyticsRunId: $id, locationId: $locationId) {
      analyticsRunId
      items {
        menu
        menuCategory
        menuCategoryDetail
        quantity
        totalRevenue
      }
    }
  }
`

export type PromotionMenuItemsData = {
  promotionMenuItems: {
    analyticsRunId: string
    items: Array<{
      menu: string
      menuCategory: string | null
      menuCategoryDetail: string | null
      quantity: number
      totalRevenue: number
    }>
  } | null
}

export const PUBLIC_HOLIDAYS_QUERY = `
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
`

export type PublicHolidayItem = {
  id: string
  date: string
  name: string
  localName: string
  holidayType: string
  isTentative: boolean
}

export type PublicHolidaysData = {
  publicHolidays: PublicHolidayItem[]
}
