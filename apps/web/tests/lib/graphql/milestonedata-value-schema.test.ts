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
      title: 'Monthly top menu',
      post: {
        id: 'pinned-monthly-menu',
        format: 'carousel',
        intent: 'pinned_monthly_menu',
        title: 'Monthly top menu',
        groupIds: ['group-1'],
        slides: [{ dishName: 'Ribeye', imageBrief: 'Hero menu photography brief.' }],
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
})
