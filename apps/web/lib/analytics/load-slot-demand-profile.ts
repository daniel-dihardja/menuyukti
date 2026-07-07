import { graphqlQuery } from '@/lib/graphql/client'
import {
  ANALYTICS_RUNS_BY_LOCATION_QUERY,
  ORDER_METRICS_QUERY,
  type AnalyticsRunsByLocationData,
  type OrderMetricsData,
  type SlotDemandCell,
} from '@/lib/graphql/queries/analytics'

export type LoadSlotDemandProfileOptions = {
  userId: string
  locationId?: number | null
  analyticsRunId?: number | string | null
}

export type LoadSlotDemandProfileResult = {
  slotDemandProfile: SlotDemandCell[]
  analyticsRunId: string | null
  usedFallbackRun: boolean
}

async function fetchSlotDemandProfileForRun(
  userId: string,
  analyticsRunId: string,
): Promise<SlotDemandCell[]> {
  const data = await graphqlQuery<OrderMetricsData>(
    ORDER_METRICS_QUERY,
    { analyticsRunId },
    userId,
    'OrderMetrics',
  )
  return data.orderMetrics?.slotDemandProfile ?? []
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

/**
 * Load slot demand for workflow visualizations.
 * Tries the workflow-linked run first, then newer runs for the location when empty.
 */
export async function loadSlotDemandProfileForWorkflow(
  options: LoadSlotDemandProfileOptions,
): Promise<LoadSlotDemandProfileResult> {
  const preferredRunId =
    options.analyticsRunId != null && String(options.analyticsRunId).length > 0
      ? String(options.analyticsRunId)
      : null

  if (preferredRunId) {
    const profile = await fetchSlotDemandProfileForRun(options.userId, preferredRunId)
    if (profile.length > 0) {
      return {
        slotDemandProfile: profile,
        analyticsRunId: preferredRunId,
        usedFallbackRun: false,
      }
    }
  }

  if (options.locationId != null && Number.isInteger(options.locationId)) {
    const runIds = await listAnalyticsRunIdsForLocation(options.userId, options.locationId)
    for (const runId of runIds) {
      if (runId === preferredRunId) continue
      const profile = await fetchSlotDemandProfileForRun(options.userId, runId)
      if (profile.length > 0) {
        return {
          slotDemandProfile: profile,
          analyticsRunId: runId,
          usedFallbackRun: preferredRunId !== null,
        }
      }
    }
  }

  return {
    slotDemandProfile: [],
    analyticsRunId: preferredRunId,
    usedFallbackRun: false,
  }
}
