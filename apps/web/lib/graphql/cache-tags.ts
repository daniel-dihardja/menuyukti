/**
 * Cache tag helpers for `use cache` / `revalidateTag` (always scope by user).
 * TTL is set via `cacheLife` next to `cacheTag` in cached query functions.
 */

/**
 * Pass as the second argument to `revalidateTag` from route handlers after a mutation.
 * Using the string profile `'max'` is stale-while-revalidate under Cache Components: the
 * next request can still receive the previous cached value (e.g. deleted workflows
 * appearing until a second reload). `{ expire: 0 }` expires the stale entry immediately.
 */
export const revalidateTagAfterMutation = { expire: 0 } as const

export function graphqlLocationsDataCacheTag(userId: string): string {
  return `graphql-locations-data-${userId}`
}

export function graphqlWorkflowsByLocationCacheTag(userId: string, locationId: number): string {
  return `graphql-workflows-by-location-${userId}-${locationId}`
}

export function graphqlAnalyticsRunsByLocationCacheTag(userId: string, locationId: number): string {
  return `graphql-analytics-runs-by-location-${userId}-${locationId}`
}

export function graphqlAnalyticsRunCacheTag(userId: string, analyticsRunId: string): string {
  return `graphql-analytics-run-${userId}-${analyticsRunId}`
}

export function graphqlImageAiFlowsCacheTag(userId: string): string {
  return `graphql-image-ai-flows-${userId}`
}

/**
 * Shared tag for expensive analytics computations (matrix, heatmaps) for one run.
 * Call `revalidateTag` from routes that change underlying order/COGS data when those exist.
 */
export function graphqlAnalyticsRunComputationsCacheTag(
  userId: string,
  analyticsRunId: string,
): string {
  return `graphql-analytics-run-computations-${userId}-${analyticsRunId}`
}

export function graphqlWorkflowCampaignTreeCacheTag(userId: string, workflowId: string): string {
  return `graphql-workflow-campaign-tree-${userId}-${workflowId}`
}

export function graphqlSchedulerCalendarCacheTag(userId: string, locationId: number): string {
  return `graphql-scheduler-calendar-${userId}-${locationId}`
}
