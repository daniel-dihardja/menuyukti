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

export const ORDER_METRICS_QUERY = `
  query OrderMetrics($analyticsRunId: ID!) {
    orderMetrics(analyticsRunId: $analyticsRunId) {
      avgOrderSize
      avgOrderRevenue
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
`

export type OrderMetricsData = {
  orderMetrics: {
    avgOrderSize: number
    avgOrderRevenue: number
    slotDemandProfile: SlotDemandCell[]
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

export const MENU_COMBOS_QUERY = `
  query MenuCombos($id: ID!, $locationId: ID) {
    menuCombos(analyticsRunId: $id, locationId: $locationId) {
      totalOrders
      multiItemOrderCount
      avgDistinctItemsPerOrder
      scope
      focusMenus
      pairs {
        menuA
        menuB
        coOrderCount
        support
        confidenceAToB
        confidenceBToA
        lift
        menuACategory
        menuBCategory
        matrixCategoryA
        matrixCategoryB
      }
      matrixLift
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
      topPairTiming {
        menuA
        menuB
      recommendedWindow {
        bestDay
        bestMealPeriod
        bestMealPeriodLabel
        bestMealPeriodHoursLabel
        peakHour
        coOrderIndex
        sampleCoOrders
        confidenceTier
      }
      promoPosture {
        promoPosture
        peakDay
        peakMealPeriod
        pairCoOrderIndex
        venueDemandIndex
        venueRelativeDemand
        promoReason
      }
      dayMealCells {
        day
        mealPeriod
        mealPeriodLabel
        mealPeriodHoursLabel
        coOrderCount
          coOrderIndex
          attachRate
        }
        hourlyCoOrders {
          hour
          coOrderCount
        }
      }
    }
  }
`

export type ComboPairTimingCell = {
  day: string
  mealPeriod: string
  mealPeriodLabel: string
  mealPeriodHoursLabel: string
  coOrderCount: number
  coOrderIndex: number
  attachRate: number
}

export type ComboPairTimingHour = {
  hour: number
  coOrderCount: number
}

export type ComboPairRecommendedWindow = {
  bestDay: string | null
  bestMealPeriod: string | null
  bestMealPeriodLabel: string | null
  bestMealPeriodHoursLabel: string | null
  peakHour: number | null
  coOrderIndex: number | null
  sampleCoOrders: number
  confidenceTier: string
}

export type ComboPromoPosture = {
  promoPosture: PromoPosture
  peakDay: string | null
  peakMealPeriod: string | null
  pairCoOrderIndex: number | null
  venueDemandIndex: number | null
  venueRelativeDemand: RelativeDemand | null
  promoReason: string
}

export type SlotDemandCell = {
  day: string
  mealPeriod: string
  mealPeriodLabel: string
  mealPeriodHoursLabel: string
  orderCount: number
  trafficShare: number
  demandIndex: number
  relativeDemand: RelativeDemand
}

export type RelativeDemand = 'low' | 'average' | 'high'
export type PromoPosture = 'support' | 'promote' | 'maintain'

export type MenuComboPairTiming = {
  menuA: string
  menuB: string
  recommendedWindow: ComboPairRecommendedWindow
  promoPosture: ComboPromoPosture
  dayMealCells: ComboPairTimingCell[]
  hourlyCoOrders: ComboPairTimingHour[]
}

export type MenuComboPair = {
  menuA: string
  menuB: string
  coOrderCount: number
  support: number
  confidenceAToB: number
  confidenceBToA: number
  lift: number
  menuACategory: string | null
  menuBCategory: string | null
  matrixCategoryA: string | null
  matrixCategoryB: string | null
}

export type MenuCombosData = {
  menuCombos: {
    totalOrders: number
    multiItemOrderCount: number
    avgDistinctItemsPerOrder: number
    scope: string
    focusMenus: string[]
    pairs: MenuComboPair[]
    matrixLift: Array<Array<number | null>>
    slotDemandProfile: SlotDemandCell[]
    topPairTiming: MenuComboPairTiming[]
  } | null
}

export const MENU_COMBOS_LIFT_MATRIX_QUERY = `
  query MenuCombosLiftMatrix($id: ID!, $locationId: ID) {
    menuCombos(analyticsRunId: $id, locationId: $locationId) {
      focusMenus
      matrixLift
      totalOrders
      multiItemOrderCount
      scope
    }
  }
`

export type MenuCombosLiftMatrixData = {
  menuCombos: {
    focusMenus: string[]
    matrixLift: Array<Array<number | null>>
    totalOrders: number
    multiItemOrderCount: number
    scope: string
  } | null
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

export const INSTAGRAM_SIGNALS_QUERY = `
  query InstagramSignals($analyticsRunId: ID!, $locationId: ID) {
    instagramSignals(analyticsRunId: $analyticsRunId, locationId: $locationId) {
      analyticsRunId
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
            menuCategory
            menuCategoryDetail
          }
          avoidItems {
            menu
            matrixCategory
            totalRevenue
            menuCategory
            menuCategoryDetail
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
`

export type InstagramSignalsMatrixItem = {
  menu: string
  matrixCategory: string
  totalRevenue: number
  menuCategory: string | null
  menuCategoryDetail: string | null
}

export type InstagramSignalsTrendingItem = {
  menu: string
  currentRevenue: number
  previousRevenue: number
  changePct: number | null
  rankCurrent: number
  rankPrevious: number
  trendLabel: string
}

export type InstagramSignalsData = {
  instagramSignals: {
    analyticsRunId: string
    capabilities: {
      hasOrderId: boolean
      hasDatetime: boolean
      enabledBlocks: string[]
    }
    fundamentalSignals: {
      sales: {
        totalItemsSold: number
        totalRevenue: number
        uniqueMenuItems: number
        avgItemPrice: number
        avgPopularityThreshold: number
      }
      categoryFocus: {
        category: string | null
        revenueShare: number
        quantityShare: number
      } | null
      trendingItems: InstagramSignalsTrendingItem[]
    }
    additionalSignals: {
      orderSignals: {
        totalOrders: number
        avgOrderRevenue: number
        maxOrderRevenue: number
        minOrderRevenue: number
        avgOrderItems: number
        maxOrderItems: number
        minOrderItems: number
      } | null
      datetimeSignals: {
        bestPostingWindow: {
          peakDay: string | null
          peakRevenueDay: string | null
          primaryMealPeriod: string | null
          peakRevenueMealPeriod: string | null
          peakHour: number | null
        }
        periodHeadline: {
          periodStart: string
          periodEnd: string
          totalRevenue: number
          previousPeriodTotalRevenue: number
          revenueVsPreviousPct: number | null
        }
      } | null
      matrixSignals: {
        contentHeroes: InstagramSignalsMatrixItem[]
        avoidItems: InstagramSignalsMatrixItem[]
      }
      campaignPlanningSignals: {
        recommendedPostingDays: string[]
        recommendedDayparts: string[]
        objectiveRecommendation: string
        primaryCtaChannel: string
      }
      signalConfidence: {
        tier: string
        coverageNotes: string[]
      }
    }
  } | null
}

export const ANALYTICS_BUNDLE_HEATMAP_QUERY = `
  query AnalyticsBundleHeatmap($analyticsRunId: ID!, $locationId: ID) {
    analyticsBundle(
      analyticsRunId: $analyticsRunId
      locationId: $locationId
      options: {
        includeOrderMetrics: false
        includeMenuEngineeringMatrix: true
        includeMenuHeatmaps: true
        includeCategoryMix: false
      }
    ) {
      analyticsRunId
      menuEngineeringMatrix {
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
      menuHeatmaps {
        menu
        menuCategory
        menuCategoryDetail
        reportingPeriod
        dailyHeatmap { hour quantity }
        weeklyHeatmap { day quantity }
      }
    }
  }
`

export type AnalyticsBundleHeatmapData = {
  analyticsBundle: {
    analyticsRunId: string
    menuEngineeringMatrix: MenuEngineeringMatrixData['menuEngineeringMatrix']
    menuHeatmaps: MenuHeatmapsData['menuHeatmaps']
  } | null
}
