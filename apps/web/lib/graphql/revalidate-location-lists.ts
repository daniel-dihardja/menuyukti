import { revalidateTag } from 'next/cache'

import {
  graphqlAnalyticsRunsByLocationCacheTag,
  graphqlWorkflowsByLocationCacheTag,
} from '@/lib/graphql/cache-tags'

/**
 * Invalidate location-scoped list caches impacted by analytics/workflow writes.
 */
export function revalidateLocationScopedLists(userId: string, locationId: number): void {
  revalidateTag(graphqlAnalyticsRunsByLocationCacheTag(userId, locationId), 'max')
  revalidateTag(graphqlWorkflowsByLocationCacheTag(userId, locationId), 'max')
}
