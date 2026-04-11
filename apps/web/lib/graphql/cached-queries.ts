import { unstable_cache } from 'next/cache'

import { graphqlQuery } from '@/lib/graphql/client'
import {
  graphqlAnalyticsRunCacheTag,
  graphqlImageAiFlowsCacheTag,
  graphqlLocationsDataCacheTag,
} from '@/lib/graphql/cache-tags'
import {
  ANALYTICS_RUN_METADATA_QUERY,
  IMAGE_AI_FLOWS_QUERY,
  LOCATIONS_QUERY,
  type AnalyticsRunMetadataData,
  type ImageAiFlowsData,
  type LocationsData,
} from '@/lib/graphql/queries'

/** Cached per user; reduces duplicate GraphQL hits on analytics entry routes. */
export function getCachedLocationsData(userId: string) {
  const tag = graphqlLocationsDataCacheTag(userId)
  return unstable_cache(
    () => graphqlQuery<LocationsData>(LOCATIONS_QUERY, undefined, userId, 'Locations'),
    ['graphql-locations-data', userId],
    { revalidate: 60, tags: [tag] },
  )()
}

/** Cached per user and analytics run; metadata only (no `menuItemCogs`) for matrix/heatmap shells. */
export function getCachedAnalyticsRun(userId: string, analyticsRunId: string) {
  const tag = graphqlAnalyticsRunCacheTag(userId, analyticsRunId)
  return unstable_cache(
    () =>
      graphqlQuery<AnalyticsRunMetadataData>(
        ANALYTICS_RUN_METADATA_QUERY,
        { id: analyticsRunId },
        userId,
        'AnalyticsRunMetadata',
      ),
    ['graphql-analytics-run', userId, analyticsRunId],
    { revalidate: 60, tags: [tag] },
  )()
}

/** Cached per user; Studio list of image AI flows. */
export function getCachedImageAiFlows(userId: string) {
  const tag = graphqlImageAiFlowsCacheTag(userId)
  return unstable_cache(
    () =>
      graphqlQuery<ImageAiFlowsData>(
        IMAGE_AI_FLOWS_QUERY,
        { includeInactive: true },
        userId,
        'ImageAiFlows',
      ),
    ['graphql-image-ai-flows', userId],
    { revalidate: 60, tags: [tag] },
  )()
}
