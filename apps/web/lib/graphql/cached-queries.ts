import { unstable_cache } from 'next/cache'

import { graphqlQuery } from '@/lib/graphql/client'
import {
  graphqlAnalyticsRunCacheTag,
  graphqlImageAiFlowsCacheTag,
  graphqlLocationsDataCacheTag,
} from '@/lib/graphql/cache-tags'
import {
  ANALYTICS_RUN_QUERY,
  IMAGE_AI_FLOWS_QUERY,
  LOCATIONS_QUERY,
  type AnalyticsRunData,
  type ImageAiFlowsData,
  type LocationsData,
} from '@/lib/graphql/queries'

/** Cached per user; reduces duplicate GraphQL hits on analytics entry routes. */
export function getCachedLocationsData(userId: string) {
  const tag = graphqlLocationsDataCacheTag(userId)
  return unstable_cache(
    () => graphqlQuery<LocationsData>(LOCATIONS_QUERY, undefined, userId),
    ['graphql-locations-data', userId],
    { revalidate: 60, tags: [tag] },
  )()
}

/** Cached per user and analytics run; heatmap and matrix (not COGS — run includes mutable `menuItemCogs`). */
export function getCachedAnalyticsRun(userId: string, analyticsRunId: string) {
  const tag = graphqlAnalyticsRunCacheTag(userId, analyticsRunId)
  return unstable_cache(
    () => graphqlQuery<AnalyticsRunData>(ANALYTICS_RUN_QUERY, { id: analyticsRunId }, userId),
    ['graphql-analytics-run', userId, analyticsRunId],
    { revalidate: 60, tags: [tag] },
  )()
}

/** Cached per user; Studio list of image AI flows. */
export function getCachedImageAiFlows(userId: string) {
  const tag = graphqlImageAiFlowsCacheTag(userId)
  return unstable_cache(
    () => graphqlQuery<ImageAiFlowsData>(IMAGE_AI_FLOWS_QUERY, { includeInactive: true }, userId),
    ['graphql-image-ai-flows', userId],
    { revalidate: 60, tags: [tag] },
  )()
}
