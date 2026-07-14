import { graphqlQuery } from '@/lib/graphql/client'
import {
  ANALYTICS_RUNS_BY_LOCATION_QUERY,
  MENU_COMBOS_LIFT_MATRIX_QUERY,
  type AnalyticsRunsByLocationData,
  type MenuCombosLiftMatrixData,
} from '@/lib/graphql/queries/analytics'

export type PairLiftMatrixPayload = NonNullable<MenuCombosLiftMatrixData['menuCombos']>

export type LoadPairLiftMatrixForWorkflowOptions = {
  userId: string
  locationId?: number | null
  analyticsRunId?: number | string | null
}

export type LoadPairLiftMatrixForWorkflowResult = {
  focusMenus: string[]
  matrixLift: Array<Array<number | null>>
  totalOrders: number
  multiItemOrderCount: number
  scope: string
  analyticsRunId: string | null
  usedFallbackRun: boolean
}

export function hasLiftMatrixData(payload: PairLiftMatrixPayload | null | undefined): boolean {
  return payload != null && payload.focusMenus.length >= 2
}

async function fetchLiftMatrixForRun(
  userId: string,
  analyticsRunId: string,
  locationId: string | null,
): Promise<PairLiftMatrixPayload | null> {
  const data = await graphqlQuery<MenuCombosLiftMatrixData>(
    MENU_COMBOS_LIFT_MATRIX_QUERY,
    { id: analyticsRunId, locationId },
    userId,
    'MenuCombosLiftMatrix',
  )
  return data.menuCombos
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

function toResult(
  payload: PairLiftMatrixPayload,
  analyticsRunId: string,
  usedFallbackRun: boolean,
): LoadPairLiftMatrixForWorkflowResult {
  return {
    focusMenus: payload.focusMenus,
    matrixLift: payload.matrixLift,
    totalOrders: payload.totalOrders,
    multiItemOrderCount: payload.multiItemOrderCount,
    scope: payload.scope,
    analyticsRunId,
    usedFallbackRun,
  }
}

function emptyResult(preferredRunId: string | null): LoadPairLiftMatrixForWorkflowResult {
  return {
    focusMenus: [],
    matrixLift: [],
    totalOrders: 0,
    multiItemOrderCount: 0,
    scope: '',
    analyticsRunId: preferredRunId,
    usedFallbackRun: false,
  }
}

/**
 * Load pair lift matrix data for workflow visualizations.
 * Tries the workflow-linked run first, then newer runs for the location when empty.
 */
export async function loadPairLiftMatrixForWorkflow(
  options: LoadPairLiftMatrixForWorkflowOptions,
): Promise<LoadPairLiftMatrixForWorkflowResult> {
  const preferredRunId =
    options.analyticsRunId != null && String(options.analyticsRunId).length > 0
      ? String(options.analyticsRunId)
      : null

  const locationIdStr =
    options.locationId != null && Number.isInteger(options.locationId)
      ? String(options.locationId)
      : null

  if (preferredRunId) {
    const payload = await fetchLiftMatrixForRun(options.userId, preferredRunId, locationIdStr)
    if (hasLiftMatrixData(payload)) {
      return toResult(payload!, preferredRunId, false)
    }
  }

  if (options.locationId != null && Number.isInteger(options.locationId)) {
    const runIds = await listAnalyticsRunIdsForLocation(options.userId, options.locationId)
    for (const runId of runIds) {
      if (runId === preferredRunId) continue
      const payload = await fetchLiftMatrixForRun(options.userId, runId, locationIdStr)
      if (hasLiftMatrixData(payload)) {
        return toResult(payload!, runId, preferredRunId !== null)
      }
    }
  }

  return emptyResult(preferredRunId)
}
