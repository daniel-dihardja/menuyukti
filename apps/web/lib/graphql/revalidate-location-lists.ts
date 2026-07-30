import { revalidateTag } from 'next/cache'

import {
  graphqlAnalyticsRunsByLocationCacheTag,
  revalidateTagAfterMutation,
} from '@/lib/graphql/cache-tags'

/**
 * Invalidate location-scoped list caches impacted by analytics writes.
 */
export function revalidateLocationScopedLists(userId: string, locationId: number): void {
  revalidateTag(
    graphqlAnalyticsRunsByLocationCacheTag(userId, locationId),
    revalidateTagAfterMutation,
  )
}
