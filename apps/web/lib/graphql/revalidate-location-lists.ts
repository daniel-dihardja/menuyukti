import { revalidateTag } from 'next/cache'

import {
  graphqlAnalyticsRunsByLocationCacheTag,
  graphqlWorkflowsByLocationCacheTag,
  revalidateTagAfterMutation,
} from '@/lib/graphql/cache-tags'

/**
 * Invalidate location-scoped list caches impacted by analytics/workflow writes.
 */
export function revalidateLocationScopedLists(userId: string, locationId: number): void {
  revalidateTag(
    graphqlAnalyticsRunsByLocationCacheTag(userId, locationId),
    revalidateTagAfterMutation,
  )
  revalidateTag(graphqlWorkflowsByLocationCacheTag(userId, locationId), revalidateTagAfterMutation)
}
