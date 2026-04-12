/**
 * Cache tag helpers for `use cache` / `revalidateTag` (always scope by user).
 * TTL is set via `cacheLife` next to `cacheTag` in cached query functions.
 */

export function graphqlLocationsDataCacheTag(userId: string): string {
  return `graphql-locations-data-${userId}`
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
