import { revalidateTag } from 'next/cache'

import {
  graphqlAnalyticsRunComputationsCacheTag,
  revalidateTagAfterMutation,
} from '@/lib/graphql/cache-tags'

/** Clears cached matrix + heatmap for a run (call from COGS/upload routes when added). */
export function revalidateAnalyticsRunComputationsCache(
  userId: string,
  analyticsRunId: string,
): void {
  revalidateTag(
    graphqlAnalyticsRunComputationsCacheTag(userId, analyticsRunId),
    revalidateTagAfterMutation,
  )
}
