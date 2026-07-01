import type { PostLineupMilestoneData, PostLineupPost } from '@/lib/graphql/node-schemas'
import { postLineupMilestoneDataSchema } from '@/lib/graphql/node-schemas'

export const POST_LINEUP_TOP_FIVE_ID_PREFIX = 'top-five'
export const POST_LINEUP_MAX_SLIDES = 5

export const EMPTY_POST_LINEUP_DATA: PostLineupMilestoneData = {
  posts: [],
}

/** Parse persisted/API post lineup payload; returns null when missing or invalid (never empty fallback). */
export function parsePostLineupMilestoneDataOrNull(raw: unknown): PostLineupMilestoneData | null {
  if (raw == null || typeof raw !== 'object') {
    return null
  }
  const parsed = postLineupMilestoneDataSchema.safeParse(raw)
  return parsed.success ? parsed.data : null
}

export function isEmptyPostLineupData(data: unknown): data is PostLineupMilestoneData {
  return (
    data != null &&
    typeof data === 'object' &&
    'posts' in data &&
    Array.isArray((data as PostLineupMilestoneData).posts) &&
    (data as PostLineupMilestoneData).posts.length === 0
  )
}

export function hasPostLineupPosts(data: unknown): data is PostLineupMilestoneData {
  return (
    data != null &&
    typeof data === 'object' &&
    'posts' in data &&
    Array.isArray((data as PostLineupMilestoneData).posts) &&
    (data as PostLineupMilestoneData).posts.length > 0
  )
}

/** Build Instagram Top 5 post lineup milestone data (deterministic merge for tests). */
export function buildPostLineupFromPlan(
  topFivePosts: PostLineupPost[],
  options?: {
    startDate?: string
    endDate?: string
    sourceMenuTaggerTitle?: string
    sourceCampaignBriefTitle?: string
    sourceDatesTitle?: string
    notes?: string
  },
): PostLineupMilestoneData {
  const startDate = options?.startDate?.trim() ?? ''
  const endDate = options?.endDate?.trim() ?? ''
  if (!startDate || !endDate) {
    throw new Error('post_lineup requires startDate and endDate')
  }

  const sourceMenuTaggerTitle = options?.sourceMenuTaggerTitle?.trim()
  const sourceCampaignBriefTitle = options?.sourceCampaignBriefTitle?.trim()
  const sourceDatesTitle = options?.sourceDatesTitle?.trim()
  const notes = options?.notes?.trim()

  return {
    posts: topFivePosts,
    startDate,
    endDate,
    ...(sourceMenuTaggerTitle ? { sourceMenuTaggerTitle } : {}),
    ...(sourceCampaignBriefTitle ? { sourceCampaignBriefTitle } : {}),
    ...(sourceDatesTitle ? { sourceDatesTitle } : {}),
    ...(notes ? { notes } : {}),
  }
}
