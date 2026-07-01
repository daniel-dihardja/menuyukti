import { describe, expect, it } from 'vitest'

import {
  getMilestonePresetCreateFields,
  MILESTONE_PRESET_REGISTRY,
} from '@/lib/milestones/preset-definitions'
import { milestonedataValueSchema, postLineupMilestoneDataSchema } from '@/lib/graphql/node-schemas'
import { buildPostLineupFromPlan } from '@/lib/milestones/post-lineup'

describe('post_lineup preset', () => {
  it('registers preset with empty data schema', () => {
    const parsed = postLineupMilestoneDataSchema.safeParse(
      MILESTONE_PRESET_REGISTRY.post_lineup.emptyData,
    )
    expect(parsed.success).toBe(true)
  })

  it('getMilestonePresetCreateFields seeds post_lineup input', () => {
    const fields = getMilestonePresetCreateFields('post_lineup', (k) => k)
    expect(fields.presetId).toBe('post_lineup')
    expect(fields.milestoneInput).toEqual({
      type: 'post_lineup',
      value: { notes: '' },
    })
    expect(fields.milestoneData).toMatchObject({ posts: [] })
    expect(fields.passCriteria?.map((row) => row.requirement)).toEqual([
      'milestonePreset.post_lineup.criterionPriorDates',
      'milestonePreset.post_lineup.criterionPriorCampaignBrief',
      'milestonePreset.post_lineup.criterionPriorMenuClusterer',
      'milestonePreset.post_lineup.criterionCarouselPost',
      'milestonePreset.post_lineup.criterionSlideCount',
      'milestonePreset.post_lineup.criterionSlideFields',
    ])
  })

  it('milestonedataValueSchema accepts built top five posts for milestone run', () => {
    const startDate = '2026-06-01'
    const endDate = '2026-06-30'
    const built = buildPostLineupFromPlan(
      [
        {
          id: 'top-five-mains',
          format: 'carousel',
          intent: 'top_five_category',
          title: 'Top 5 MAINS',
          category: 'MAINS',
          intervalWeeks: 2,
          fixdate: false,
          slides: [
            {
              dishName: 'Ribeye',
              imageBrief: 'Hero brief.',
              caption: 'Ribeye caption.',
            },
          ],
        },
      ],
      { startDate, endDate },
    )

    expect(milestonedataValueSchema.safeParse(built).success).toBe(true)
    expect(milestonedataValueSchema.nullish().safeParse(null).success).toBe(true)
  })
})
