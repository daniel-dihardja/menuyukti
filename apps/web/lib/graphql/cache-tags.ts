/** Cache tag helpers for `unstable_cache` / `revalidateTag` (always scope by user). */

export function graphqlLocationsDataCacheTag(userId: string): string {
  return `graphql-locations-data-${userId}`
}

export function graphqlAnalyticsRunCacheTag(userId: string, analyticsRunId: string): string {
  return `graphql-analytics-run-${userId}-${analyticsRunId}`
}

export function graphqlImageAiFlowsCacheTag(userId: string): string {
  return `graphql-image-ai-flows-${userId}`
}
