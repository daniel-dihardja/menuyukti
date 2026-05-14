import { describe, expect, it } from 'vitest'

import { milestonePresetFrom } from '@/app/(protected)/workflow/_components/milestone-map'
import { milestonedataValueSchema } from '@/lib/graphql/node-schemas'

const schedulerPayload = {
  startDate: '2026-06-01',
  endDate: '2026-06-30',
  publicHolidays: [{ name: 'Easter Sunday', description: 'Desc', date: '2026-06-15' }],
  slots: [
    {
      date: '2026-06-15',
      time: '10:00',
      title: 'Story: sending happy Easter Sunday',
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
    expect(parsed.data).toMatchObject({
      startDate: '2026-06-01',
      endDate: '2026-06-30',
      slots: schedulerPayload.slots,
    })
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
