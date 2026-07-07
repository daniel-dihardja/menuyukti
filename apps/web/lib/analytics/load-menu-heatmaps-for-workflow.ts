import { deriveDailyHeatmapHourRange } from '@/lib/analytics/heatmap-hours'
import { graphqlQuery } from '@/lib/graphql/client'
import {
  ANALYTICS_BUNDLE_HEATMAP_QUERY,
  ANALYTICS_RUNS_BY_LOCATION_QUERY,
  type AnalyticsBundleHeatmapData,
  type AnalyticsRunsByLocationData,
  type MenuEngineeringMatrixData,
  type MenuHeatmapsData,
} from '@/lib/graphql/queries/analytics'
import { LOCATION_QUERY, type LocationData } from '@/lib/graphql/queries/locations'

export type MenuHeatmapMatrixItem = NonNullable<
  MenuEngineeringMatrixData['menuEngineeringMatrix']
>['items'][number]

export type LoadMenuHeatmapsForWorkflowOptions = {
  userId: string
  locationId?: number | null
  analyticsRunId?: number | string | null
}

export type LoadMenuHeatmapsForWorkflowResult = {
  menuHeatmaps: MenuHeatmapsData['menuHeatmaps']
  matrixItems: MenuHeatmapMatrixItem[] | null
  dailyStartHour: number
  dailyEndHour: number
  analyticsRunId: string | null
  usedFallbackRun: boolean
}

type BundlePayload = {
  menuHeatmaps: MenuHeatmapsData['menuHeatmaps']
  matrixItems: MenuHeatmapMatrixItem[] | null
}

async function fetchHeatmapBundleForRun(
  userId: string,
  analyticsRunId: string,
  locationId: string | null,
): Promise<BundlePayload> {
  const data = await graphqlQuery<AnalyticsBundleHeatmapData>(
    ANALYTICS_BUNDLE_HEATMAP_QUERY,
    { analyticsRunId, locationId },
    userId,
    'AnalyticsBundleHeatmap',
  )
  const bundle = data.analyticsBundle
  const menuHeatmaps = bundle?.menuHeatmaps ?? []
  const matrix = bundle?.menuEngineeringMatrix
  const matrixItems =
    matrix != null && Array.isArray(matrix.items) && matrix.items.length > 0 ? matrix.items : null

  return { menuHeatmaps, matrixItems }
}

async function listAnalyticsRunIdsForLocation(
  userId: string,
  locationId: number,
): Promise<string[]> {
  const data = await graphqlQuery<AnalyticsRunsByLocationData>(
    ANALYTICS_RUNS_BY_LOCATION_QUERY,
    { locationId, first: 300 },
    userId,
    'AnalyticsRunsByLocation',
  )
  return (data.analyticsRuns ?? []).map((run) => String(run.id))
}

async function fetchDailyHourRange(
  userId: string,
  locationId: number,
): Promise<{ dailyStartHour: number; dailyEndHour: number }> {
  const data = await graphqlQuery<LocationData>(
    LOCATION_QUERY,
    { id: String(locationId) },
    userId,
    'Location',
  )
  const range = deriveDailyHeatmapHourRange(data.location?.openingHours ?? [])
  return { dailyStartHour: range.startHour, dailyEndHour: range.endHour }
}

/**
 * Load menu heatmaps (and optional matrix items) for workflow visualizations.
 * Tries the workflow-linked run first, then newer runs for the location when empty.
 */
export async function loadMenuHeatmapsForWorkflow(
  options: LoadMenuHeatmapsForWorkflowOptions,
): Promise<LoadMenuHeatmapsForWorkflowResult> {
  const preferredRunId =
    options.analyticsRunId != null && String(options.analyticsRunId).length > 0
      ? String(options.analyticsRunId)
      : null

  const locationIdStr =
    options.locationId != null && Number.isInteger(options.locationId)
      ? String(options.locationId)
      : null

  const hourRangePromise =
    options.locationId != null && Number.isInteger(options.locationId)
      ? fetchDailyHourRange(options.userId, options.locationId)
      : Promise.resolve(
          deriveDailyHeatmapHourRange([]) as { startHour: number; endHour: number },
        ).then((range) => ({
          dailyStartHour: range.startHour,
          dailyEndHour: range.endHour,
        }))

  let winningBundle: BundlePayload | null = null
  let winningRunId: string | null = null
  let usedFallbackRun = false

  if (preferredRunId) {
    const bundle = await fetchHeatmapBundleForRun(options.userId, preferredRunId, locationIdStr)
    if (bundle.menuHeatmaps.length > 0) {
      winningBundle = bundle
      winningRunId = preferredRunId
    }
  }

  if (!winningBundle && options.locationId != null && Number.isInteger(options.locationId)) {
    const runIds = await listAnalyticsRunIdsForLocation(options.userId, options.locationId)
    for (const runId of runIds) {
      if (runId === preferredRunId) continue
      const bundle = await fetchHeatmapBundleForRun(options.userId, runId, locationIdStr)
      if (bundle.menuHeatmaps.length > 0) {
        winningBundle = bundle
        winningRunId = runId
        usedFallbackRun = preferredRunId !== null
        break
      }
    }
  }

  const { dailyStartHour, dailyEndHour } = await hourRangePromise

  if (!winningBundle) {
    return {
      menuHeatmaps: [],
      matrixItems: null,
      dailyStartHour,
      dailyEndHour,
      analyticsRunId: preferredRunId,
      usedFallbackRun: false,
    }
  }

  return {
    menuHeatmaps: winningBundle.menuHeatmaps,
    matrixItems: winningBundle.matrixItems,
    dailyStartHour,
    dailyEndHour,
    analyticsRunId: winningRunId,
    usedFallbackRun,
  }
}
