import { describe, expect, it } from 'vitest'

import { milestonePresetFrom } from '@/app/(protected)/workflow/_components/milestone-map'
import { milestonedataValueSchema } from '@/lib/graphql/node-schemas'

const schedulerPayload = {
  startDate: '2026-06-01',
  endDate: '2026-06-30',
  publicHolidays: [{ name: 'Easter Sunday', description: 'Desc', date: '2026-06-15' }],
  scheduleExplanation:
    'Monthly pins anchor each block; weekday posts and reels reinforce lunch momentum.',
  slots: [
    {
      kind: 'story',
      date: '2026-06-15',
      time: '10:00',
      title: 'Story: sending happy Easter Sunday',
    },
    {
      kind: 'post',
      date: '2026-06-01',
      time: '10:00',
      title: 'Top 5 MAINS',
      post: {
        id: 'top-five-mains',
        format: 'carousel',
        intent: 'top_five_category',
        title: 'Top 5 MAINS',
        category: 'MAINS',
        intervalWeeks: 4,
        fixdate: false,
        slides: [
          {
            dishName: 'Ribeye',
            imageBrief: 'Hero menu photography brief.',
            caption: 'Ribeye caption.',
          },
        ],
      },
    },
  ],
}

describe('milestonedataValueSchema', () => {
  it('preserves scheduler slots instead of parsing as dates-only data', () => {
    const parsed = milestonedataValueSchema.safeParse(schedulerPayload)
    expect(parsed.success).toBe(true)
    if (!parsed.success) {
      return
    }
    expect('slots' in parsed.data).toBe(true)
    if (!('slots' in parsed.data)) {
      return
    }
    expect(parsed.data).toMatchObject({
      startDate: '2026-06-01',
      endDate: '2026-06-30',
      scheduleExplanation: schedulerPayload.scheduleExplanation,
      slots: schedulerPayload.slots,
    })
    expect(parsed.data.slots[0]?.kind).toBe('story')
    expect(parsed.data.slots[1]?.post?.slides[0]?.dishName).toBe('Ribeye')
  })
})

describe('milestonePresetFrom', () => {
  it('uses scheduler schema when presetId is scheduler', () => {
    const data = milestonePresetFrom(
      {
        id: '1',
        name: 'Scheduler',
        data: { presetId: 'scheduler' },
        milestonePresetData: schedulerPayload,
      },
      'scheduler',
    )

    expect(data).toMatchObject({
      slots: schedulerPayload.slots,
    })
  })

  it('accepts scheduler post slots that omit category when slides include it', () => {
    const legacyPayload = {
      ...schedulerPayload,
      slots: [
        {
          kind: 'post',
          date: '2026-07-03',
          time: '10:00',
          title: 'Top 5 DRINK',
          post: {
            id: 'top-five-drink',
            format: 'carousel',
            intent: 'top_five_category',
            title: 'Top 5 DRINK',
            slides: [
              {
                dishName: 'Latte',
                imageBrief: 'Brief.',
                caption: 'Caption.',
                category: 'DRINK',
              },
            ],
            groupIds: [],
          },
        },
      ],
    }

    const data = milestonePresetFrom(
      {
        id: '237',
        name: 'Scheduler',
        data: { presetId: 'scheduler' },
        milestonePresetData: legacyPayload,
      },
      'scheduler',
    )

    expect(data).toMatchObject({
      slots: [{ post: { category: 'DRINK' } }],
    })
  })
})
