import { cacheLife, cacheTag } from 'next/cache'

import { graphqlQuery } from '@/lib/graphql/client'
import { DEFAULT_LIST_FIRST } from '@/lib/graphql/pagination'
import {
  graphqlAnalyticsRunsByLocationCacheTag,
  graphqlAnalyticsRunCacheTag,
  graphqlAnalyticsRunComputationsCacheTag,
  graphqlLocationsDataCacheTag,
  graphqlSchedulerCalendarCacheTag,
} from '@/lib/graphql/cache-tags'
import {
  ANALYTICS_BUNDLE_HEATMAP_QUERY,
  ANALYTICS_RUN_METADATA_QUERY,
  ANALYTICS_RUNS_BY_LOCATION_QUERY,
  LOCATION_QUERY,
  LOCATION_ANALYTICS_SUMMARIES_QUERY,
  LOCATIONS_LIST_QUERY,
  LOCATIONS_QUERY,
  MENU_COMBOS_QUERY,
  MENU_ENGINEERING_MATRIX_QUERY,
  MENU_HEATMAPS_QUERY,
  INSTAGRAM_SIGNALS_QUERY,
  ORDER_METRICS_QUERY,
  PROMOTION_MENU_ITEMS_QUERY,
  PUBLIC_HOLIDAYS_QUERY,
  SCHEDULER_CALENDAR_QUERY,
  type AnalyticsBundleHeatmapData,
  type AnalyticsRunsByLocationData,
  type AnalyticsRunMetadataData,
  type LocationsListData,
  type LocationsData,
  type MenuCombosData,
  type MenuEngineeringMatrixData,
  type MenuHeatmapsData,
  type LocationAnalyticsSummariesData,
  type LocationData,
  type InstagramSignalsData,
  type OrderMetricsData,
  type PromotionMenuItemsData,
  type PublicHolidaysData,
  type SchedulerCalendarData,
} from '@/lib/graphql/queries'

/** Cached per user; list view without opening hours payload. */
export async function getCachedLocationsListData(userId: string): Promise<LocationsListData> {
  'use cache'
  cacheTag(graphqlLocationsDataCacheTag(userId))
  cacheLife({ revalidate: 60 })
  return graphqlQuery<LocationsListData>(
    LOCATIONS_LIST_QUERY,
    { first: DEFAULT_LIST_FIRST },
    userId,
    'LocationsList',
  )
}

/** Cached per user; reduces duplicate GraphQL hits on analytics entry routes. */
export async function getCachedLocationsData(userId: string): Promise<LocationsData> {
  'use cache'
  cacheTag(graphqlLocationsDataCacheTag(userId))
  cacheLife({ revalidate: 60 })
  return graphqlQuery<LocationsData>(
    LOCATIONS_QUERY,
    { first: DEFAULT_LIST_FIRST },
    userId,
    'Locations',
  )
}

/** Batch analytics run counts and latest run for many locations (one GraphQL round trip). */
export async function getCachedLocationAnalyticsSummaries(
  userId: string,
  locationIds: number[],
): Promise<LocationAnalyticsSummariesData> {
  'use cache'
  cacheTag(graphqlLocationsDataCacheTag(userId))
  cacheLife({ revalidate: 60 })
  return graphqlQuery<LocationAnalyticsSummariesData>(
    LOCATION_ANALYTICS_SUMMARIES_QUERY,
    { locationIds },
    userId,
    'LocationAnalyticsSummaries',
  )
}

/** Cached per user/location for analytics run selectors. */
export async function getCachedAnalyticsRunsByLocation(
  userId: string,
  locationId: number,
): Promise<Array<{ id: number; name: string }>> {
  'use cache'
  cacheTag(graphqlAnalyticsRunsByLocationCacheTag(userId, locationId))
  cacheLife({ revalidate: 60 })
  const data = await graphqlQuery<AnalyticsRunsByLocationData>(
    ANALYTICS_RUNS_BY_LOCATION_QUERY,
    { locationId, first: 300 },
    userId,
  )
  return (data.analyticsRuns ?? []).map((run) => ({
    id: Number(run.id),
    name: run.name || run.filename || `Run #${run.id}`,
  }))
}

/** Cached per user and analytics run; metadata only (no `menuItemCogs`) for matrix/heatmap shells. */
export async function getCachedAnalyticsRun(
  userId: string,
  analyticsRunId: string,
): Promise<AnalyticsRunMetadataData> {
  'use cache'
  cacheTag(graphqlAnalyticsRunCacheTag(userId, analyticsRunId))
  cacheLife({ revalidate: 60 })
  return graphqlQuery<AnalyticsRunMetadataData>(
    ANALYTICS_RUN_METADATA_QUERY,
    { id: analyticsRunId },
    userId,
    'AnalyticsRunMetadata',
  )
}

/** Cached single location details for location settings and route helpers. */
export async function getCachedLocation(userId: string, locationId: string): Promise<LocationData> {
  'use cache'
  cacheTag(graphqlLocationsDataCacheTag(userId))
  cacheLife({ revalidate: 60 })
  return graphqlQuery<LocationData>(LOCATION_QUERY, { id: locationId }, userId, 'Location')
}

/**
 * Menu engineering matrix for a run. Tagged with `graphqlAnalyticsRunComputationsCacheTag`
 * (shared with heatmaps). Invalidate from API routes when COGS or order facts change.
 */
export async function getCachedMenuEngineeringMatrix(
  userId: string,
  analyticsRunId: string,
  locationId?: string,
): Promise<MenuEngineeringMatrixData> {
  'use cache'
  const computationsTag = graphqlAnalyticsRunComputationsCacheTag(userId, analyticsRunId)
  cacheTag(computationsTag)
  cacheLife({ revalidate: 60 })
  return graphqlQuery<MenuEngineeringMatrixData>(
    MENU_ENGINEERING_MATRIX_QUERY,
    { id: analyticsRunId, ...(locationId != null ? { locationId } : {}) },
    userId,
    'MenuEngineeringMatrix',
  )
}

/** Basket affinity / menu combo analytics for a run. */
export async function getCachedMenuCombos(
  userId: string,
  analyticsRunId: string,
  locationId: string,
): Promise<MenuCombosData> {
  'use cache'
  cacheTag(graphqlAnalyticsRunComputationsCacheTag(userId, analyticsRunId))
  cacheLife({ revalidate: 60 })
  return graphqlQuery<MenuCombosData>(
    MENU_COMBOS_QUERY,
    { id: analyticsRunId, locationId },
    userId,
    'MenuCombos',
  )
}

/**
 * Menu heatmaps for a run. Same computation cache tag as matrix so one invalidation clears both.
 */
export async function getCachedMenuHeatmaps(
  userId: string,
  analyticsRunId: string,
  locationId: string,
): Promise<MenuHeatmapsData> {
  'use cache'
  cacheTag(graphqlAnalyticsRunComputationsCacheTag(userId, analyticsRunId))
  cacheLife({ revalidate: 60 })
  return graphqlQuery<MenuHeatmapsData>(
    MENU_HEATMAPS_QUERY,
    { id: analyticsRunId, locationId },
    userId,
    'MenuHeatmaps',
  )
}

/** Heatmap page bundle: matrix + heatmaps in one GraphQL operation. */
export async function getCachedAnalyticsBundleHeatmap(
  userId: string,
  analyticsRunId: string,
  locationId: string,
): Promise<AnalyticsBundleHeatmapData> {
  'use cache'
  cacheTag(graphqlAnalyticsRunComputationsCacheTag(userId, analyticsRunId))
  cacheLife({ revalidate: 60 })
  return graphqlQuery<AnalyticsBundleHeatmapData>(
    ANALYTICS_BUNDLE_HEATMAP_QUERY,
    { analyticsRunId, locationId },
    userId,
    'AnalyticsBundleHeatmap',
  )
}

/** Campaign brief operating signals composed from analytics pipelines for a run. */
export async function getCachedInstagramSignals(
  userId: string,
  analyticsRunId: string,
  locationId?: string,
): Promise<InstagramSignalsData> {
  'use cache'
  cacheTag(graphqlAnalyticsRunComputationsCacheTag(userId, analyticsRunId))
  cacheLife({ revalidate: 60 })
  return graphqlQuery<InstagramSignalsData>(
    INSTAGRAM_SIGNALS_QUERY,
    { analyticsRunId, ...(locationId != null ? { locationId } : {}) },
    userId,
    'InstagramSignals',
  )
}

/** Average order size and revenue for an analytics run. */
export async function getCachedOrderMetrics(
  userId: string,
  analyticsRunId: string,
): Promise<OrderMetricsData> {
  'use cache'
  cacheTag(graphqlAnalyticsRunComputationsCacheTag(userId, analyticsRunId))
  cacheLife({ revalidate: 60 })
  return graphqlQuery<OrderMetricsData>(
    ORDER_METRICS_QUERY,
    { analyticsRunId },
    userId,
    'OrderMetrics',
  )
}

/** Promotion menu items derived from order facts for an analytics run. */
export async function getCachedPromotionMenuItems(
  userId: string,
  analyticsRunId: string,
  locationId: string,
): Promise<PromotionMenuItemsData> {
  'use cache'
  cacheTag(graphqlAnalyticsRunComputationsCacheTag(userId, analyticsRunId))
  cacheLife({ revalidate: 60 })
  return graphqlQuery<PromotionMenuItemsData>(
    PROMOTION_MENU_ITEMS_QUERY,
    { id: analyticsRunId, locationId },
    userId,
    'PromotionMenuItems',
  )
}

/** Public holidays for a country and date range. */
export async function getCachedPublicHolidays(
  userId: string,
  country: string,
  startDate: string,
  endDate: string,
): Promise<PublicHolidaysData> {
  'use cache'
  cacheLife({ revalidate: 3600 })
  return graphqlQuery<PublicHolidaysData>(
    PUBLIC_HOLIDAYS_QUERY,
    { country, startDate, endDate },
    userId,
    'PublicHolidays',
  )
}

/** Aggregated scheduler slots for the location Calendar page. */
export async function getCachedSchedulerCalendar(
  userId: string,
  locationId: number,
): Promise<SchedulerCalendarData['schedulerCalendar']> {
  'use cache'
  cacheTag(graphqlSchedulerCalendarCacheTag(userId, locationId))
  cacheLife({ revalidate: 60 })
  const data = await graphqlQuery<SchedulerCalendarData>(
    SCHEDULER_CALENDAR_QUERY,
    { locationId },
    userId,
    'SchedulerCalendar',
  )
  return data.schedulerCalendar
}
