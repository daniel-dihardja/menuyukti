import { graphqlQuery } from '@/lib/graphql/client'
import {
  ANALYTICS_RUN_QUERY,
  ANALYTICS_RUNS_BY_LOCATION_QUERY,
  MENU_ENGINEERING_MATRIX_QUERY,
  type AnalyticsRunData,
  type AnalyticsRunsByLocationData,
  type MenuEngineeringMatrixData,
} from '@/lib/graphql/queries/analytics'

type MatrixPayload = NonNullable<MenuEngineeringMatrixData['menuEngineeringMatrix']>

export type LoadLowEndForChatOptions = {
  userId: string
  locationId?: number | null
  analyticsRunId?: number | string | null
}

export type LoadLowEndForChatResult = {
  items: MatrixPayload['items']
  distribution: MatrixPayload['distribution']
  periodStart: string | null
  periodEnd: string | null
  analyticsRunId: string | null
  usedFallbackRun: boolean
}

function hasMatrixData(matrix: MatrixPayload | null | undefined): matrix is MatrixPayload {
  return matrix != null && Array.isArray(matrix.items) && matrix.items.length > 0
}

async function fetchMatrixForRun(
  userId: string,
  analyticsRunId: string,
  locationId: string | null,
): Promise<MatrixPayload | null> {
  const data = await graphqlQuery<MenuEngineeringMatrixData>(
    MENU_ENGINEERING_MATRIX_QUERY,
    { id: analyticsRunId, ...(locationId != null ? { locationId } : {}) },
    userId,
    'MenuEngineeringMatrix',
  )
  return data.menuEngineeringMatrix
}

async function fetchRunPeriod(
  userId: string,
  analyticsRunId: string,
): Promise<{ periodStart: string | null; periodEnd: string | null }> {
  const data = await graphqlQuery<AnalyticsRunData>(
    ANALYTICS_RUN_QUERY,
    { id: analyticsRunId },
    userId,
    'AnalyticsRun',
  )
  return {
    periodStart: data.analyticsRun?.periodStart ?? null,
    periodEnd: data.analyticsRun?.periodEnd ?? null,
  }
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

async function toResult(
  userId: string,
  matrix: MatrixPayload,
  analyticsRunId: string,
  usedFallbackRun: boolean,
): Promise<LoadLowEndForChatResult> {
  const period = await fetchRunPeriod(userId, analyticsRunId)
  return {
    items: matrix.items,
    distribution: matrix.distribution,
    periodStart: period.periodStart,
    periodEnd: period.periodEnd,
    analyticsRunId,
    usedFallbackRun,
  }
}

function emptyResult(preferredRunId: string | null): LoadLowEndForChatResult {
  return {
    items: [],
    distribution: [],
    periodStart: null,
    periodEnd: null,
    analyticsRunId: preferredRunId,
    usedFallbackRun: false,
  }
}

/**
 * Load menu-engineering matrix (+ run period) for the Low End chat visualization.
 * Tries the preferred analytics run first, then other runs for the location when empty.
 */
export async function loadLowEndForChat(
  options: LoadLowEndForChatOptions,
): Promise<LoadLowEndForChatResult> {
  const preferredRunId =
    options.analyticsRunId != null && String(options.analyticsRunId).length > 0
      ? String(options.analyticsRunId)
      : null

  const locationIdStr =
    options.locationId != null && Number.isInteger(options.locationId)
      ? String(options.locationId)
      : null

  if (preferredRunId) {
    const matrix = await fetchMatrixForRun(options.userId, preferredRunId, locationIdStr)
    if (hasMatrixData(matrix)) {
      return toResult(options.userId, matrix, preferredRunId, false)
    }
  }

  if (options.locationId != null && Number.isInteger(options.locationId)) {
    const runIds = await listAnalyticsRunIdsForLocation(options.userId, options.locationId)
    for (const runId of runIds) {
      if (runId === preferredRunId) continue
      const matrix = await fetchMatrixForRun(options.userId, runId, locationIdStr)
      if (hasMatrixData(matrix)) {
        return toResult(options.userId, matrix, runId, preferredRunId !== null)
      }
    }
  }

  return emptyResult(preferredRunId)
}
