import { revalidateTag } from 'next/cache'

import {
  graphqlWorkflowCampaignTreeCacheTag,
  revalidateTagAfterMutation,
} from '@/lib/graphql/cache-tags'

/** Invalidate cached `WORKFLOW_CAMPAIGN_TREE_QUERY` for this workflow (after BFF mutations). */
export function revalidateWorkflowCampaignTreeCache(userId: string, workflowId: string): void {
  revalidateTag(graphqlWorkflowCampaignTreeCacheTag(userId, workflowId), revalidateTagAfterMutation)
}
