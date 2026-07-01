import { describe, expect, it } from 'vitest'

import { postLineupMilestoneDataSchema } from '@/lib/graphql/node-schemas'
import { buildPostLineupFromPlan } from '@/lib/milestones/post-lineup'

const START_DATE = '2026-06-01'
const END_DATE = '2026-06-30'

const topFivePost = {
  id: 'top-five-mains',
  format: 'carousel' as const,
  intent: 'top_five_category' as const,
  title: 'Top 5 MAINS',
  category: 'MAINS',
  intervalWeeks: 2,
  fixdate: false,
  slides: [
    {
      dishName: 'Ribeye',
      imageBrief: 'Hero photo brief.',
      caption: 'Ribeye caption.',
      storytellingFit: 'strong' as const,
      popularity: 0.82,
    },
  ],
}

describe('buildPostLineupFromPlan', () => {
  it('creates top five carousel posts only', () => {
    const result = buildPostLineupFromPlan([topFivePost], {
      startDate: START_DATE,
      endDate: END_DATE,
      sourceMenuTaggerTitle: 'Menu tagger',
      sourceCampaignBriefTitle: 'Campaign brief',
      sourceDatesTitle: 'Campaign dates',
    })

    expect(result.posts).toHaveLength(1)
    expect(result.posts[0]?.intent).toBe('top_five_category')
    expect(result.startDate).toBe(START_DATE)
    expect(result.endDate).toBe(END_DATE)
    expect(postLineupMilestoneDataSchema.safeParse(result).success).toBe(true)
    expect(result.posts[0]?.slides[0]?.caption).toBe('Ribeye caption.')
  })

  it('parsePostLineupMilestoneDataOrNull returns null for missing or invalid payloads', async () => {
    const { parsePostLineupMilestoneDataOrNull } = await import('@/lib/milestones/post-lineup')

    expect(parsePostLineupMilestoneDataOrNull(null)).toBeNull()
    expect(parsePostLineupMilestoneDataOrNull(undefined)).toBeNull()
    expect(parsePostLineupMilestoneDataOrNull({ posts: [{ id: 'bad' }] })).toBeNull()
  })

  it('rejects top_five_category slides missing caption', () => {
    const invalid = {
      posts: [
        {
          ...topFivePost,
          slides: [{ dishName: 'Ribeye', imageBrief: 'Brief.' }],
        },
      ],
      startDate: START_DATE,
      endDate: END_DATE,
    }
    expect(postLineupMilestoneDataSchema.safeParse(invalid).success).toBe(false)
  })

  it('parsePostLineupMilestoneDataOrNull accepts valid persisted payload', async () => {
    const { buildPostLineupFromPlan, parsePostLineupMilestoneDataOrNull } =
      await import('@/lib/milestones/post-lineup')
    const built = buildPostLineupFromPlan([topFivePost], {
      startDate: START_DATE,
      endDate: END_DATE,
    })

    expect(parsePostLineupMilestoneDataOrNull(built)?.posts.length).toBe(1)
  })
})
