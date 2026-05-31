import { describe, expect, it } from 'vitest'

import type { TimelineMilestone } from '@/app/(protected)/workflow/_components/timeline/types'
import {
  findPriorDatesMilestone,
  findPriorPostLineupMilestone,
  parseIsoDateOnly,
  resolvePostLineupPostsForScheduler,
  resolveSchedulerWindow,
} from '@/lib/milestones/scheduler-dates'

function milestone(
  id: string,
  presetId: TimelineMilestone['presetId'],
  overrides: Partial<TimelineMilestone> = {},
): TimelineMilestone {
  return {
    id,
    title: `Milestone ${id}`,
    passCriteria: [],
    presetId,
    ...overrides,
  }
}

describe('parseIsoDateOnly', () => {
  it('parses valid YYYY-MM-DD strings as local dates', () => {
    const date = parseIsoDateOnly('2026-05-14')
    expect(date).toBeDefined()
    expect(date?.getFullYear()).toBe(2026)
    expect(date?.getMonth()).toBe(4)
    expect(date?.getDate()).toBe(14)
  })

  it('returns undefined for invalid values', () => {
    expect(parseIsoDateOnly('')).toBeUndefined()
    expect(parseIsoDateOnly('2026-13-01')).toBeUndefined()
    expect(parseIsoDateOnly('not-a-date')).toBeUndefined()
  })
})

describe('findPriorDatesMilestone', () => {
  it('returns the nearest dates milestone before the current one', () => {
    const milestones = [
      milestone('1', 'dates', { title: 'Dates A' }),
      milestone('2', 'promotion_candidates'),
      milestone('3', 'dates', { title: 'Dates B' }),
      milestone('4', 'scheduler'),
    ]

    expect(findPriorDatesMilestone(milestones, '4')?.id).toBe('3')
    expect(findPriorDatesMilestone(milestones, '2')?.id).toBe('1')
  })

  it('returns undefined when no prior dates milestone exists', () => {
    const milestones = [milestone('1', 'promotion_candidates'), milestone('2', 'scheduler')]
    expect(findPriorDatesMilestone(milestones, '2')).toBeUndefined()
  })
})

describe('findPriorPostLineupMilestone', () => {
  it('returns the nearest post_lineup milestone before the scheduler', () => {
    const milestones = [
      milestone('1', 'post_lineup', { title: 'Posts A' }),
      milestone('2', 'story_lineup'),
      milestone('3', 'post_lineup', { title: 'Posts B' }),
      milestone('4', 'scheduler'),
    ]

    expect(findPriorPostLineupMilestone(milestones, '4')?.id).toBe('3')
    expect(findPriorPostLineupMilestone(milestones, '2')?.id).toBe('1')
  })
})

describe('resolvePostLineupPostsForScheduler', () => {
  it('returns parsed posts from the prior post_lineup milestone', () => {
    const milestones = [
      milestone('1', 'post_lineup', {
        data: {
          startDate: '2026-06-01',
          endDate: '2026-06-14',
          posts: [
            {
              id: 'post-1',
              format: 'carousel',
              intent: 'pinned_monthly_menu',
              title: 'Monthly top menu',
              groupIds: ['group-1'],
              slides: [{ dishName: 'Ribeye', imageBrief: 'Hero brief.' }],
            },
            {
              id: 'weekday-lunch-post-week-2026-06-01',
              format: 'carousel',
              intent: 'weekday_lunch_post',
              title: 'Weekday lunch',
              groupIds: ['group-1'],
              slides: [{ dishName: 'Burger', imageBrief: 'Lunch brief.' }],
            },
            {
              id: 'weekday-lunch-post-week-2026-06-08',
              format: 'carousel',
              intent: 'weekday_lunch_post',
              title: 'Weekday lunch',
              groupIds: ['group-1'],
              slides: [{ dishName: 'Burger', imageBrief: 'Lunch brief.' }],
            },
          ],
        },
      }),
      milestone('2', 'scheduler'),
    ]

    expect(resolvePostLineupPostsForScheduler(milestones, '2')).toEqual([
      {
        id: 'post-1',
        format: 'carousel',
        intent: 'pinned_monthly_menu',
        title: 'Monthly top menu',
        groupIds: ['group-1'],
        slides: [{ dishName: 'Ribeye', imageBrief: 'Hero brief.' }],
      },
      {
        id: 'weekday-lunch-post-week-2026-06-01',
        format: 'carousel',
        intent: 'weekday_lunch_post',
        title: 'Weekday lunch',
        groupIds: ['group-1'],
        slides: [{ dishName: 'Burger', imageBrief: 'Lunch brief.' }],
      },
      {
        id: 'weekday-lunch-post-week-2026-06-08',
        format: 'carousel',
        intent: 'weekday_lunch_post',
        title: 'Weekday lunch',
        groupIds: ['group-1'],
        slides: [{ dishName: 'Burger', imageBrief: 'Lunch brief.' }],
      },
    ])
  })
})

describe('resolveSchedulerWindow', () => {
  const milestones = [
    milestone('dates-1', 'dates', {
      title: 'Campaign dates',
      data: {
        startDate: '2026-06-01',
        endDate: '2026-06-30',
        publicHolidays: [{ name: 'Holiday', description: 'Desc', date: '2026-06-15' }],
      },
    }),
    milestone('scheduler-1', 'scheduler'),
  ]

  it('prefers scheduler milestone data when the window is saved', () => {
    const result = resolveSchedulerWindow({
      milestone: milestone('scheduler-1', 'scheduler', {
        data: {
          startDate: '2026-07-01',
          endDate: '2026-07-10',
          publicHolidays: [],
          slots: [],
          sourceDatesTitle: 'Saved dates',
        },
      }),
      milestones,
    })

    expect(result).toEqual({
      status: 'ready',
      window: {
        startDate: '2026-07-01',
        endDate: '2026-07-10',
        publicHolidays: [],
        sourceDatesTitle: 'Saved dates',
      },
    })
  })

  it('falls back to prior dates milestone data', () => {
    const result = resolveSchedulerWindow({
      milestone: milestones[1]!,
      milestones,
    })

    expect(result).toEqual({
      status: 'ready',
      window: {
        startDate: '2026-06-01',
        endDate: '2026-06-30',
        publicHolidays: [{ name: 'Holiday', description: 'Desc', date: '2026-06-15' }],
        sourceDatesTitle: 'Campaign dates',
      },
    })
  })

  it('falls back to prior dates milestone input when data is empty', () => {
    const result = resolveSchedulerWindow({
      milestone: milestone('scheduler-2', 'scheduler'),
      milestones: [
        milestone('dates-2', 'dates', {
          title: 'Input-only dates',
          data: { startDate: '', endDate: '', publicHolidays: [] },
          milestoneInput: {
            type: 'dates',
            value: { startDate: '2026-08-01', endDate: '2026-08-07' },
          },
        }),
        milestone('scheduler-2', 'scheduler'),
      ],
    })

    expect(result).toEqual({
      status: 'ready',
      window: {
        startDate: '2026-08-01',
        endDate: '2026-08-07',
        publicHolidays: [],
        sourceDatesTitle: 'Input-only dates',
      },
    })
  })

  it('returns no_prior_dates when the timeline has no dates milestone before scheduler', () => {
    const result = resolveSchedulerWindow({
      milestone: milestone('scheduler-3', 'scheduler'),
      milestones: [milestone('scheduler-3', 'scheduler')],
    })

    expect(result).toEqual({ status: 'no_prior_dates' })
  })

  it('returns incomplete_window when prior dates has no usable window', () => {
    const result = resolveSchedulerWindow({
      milestone: milestone('scheduler-4', 'scheduler'),
      milestones: [
        milestone('dates-4', 'dates', {
          data: { startDate: '', endDate: '', publicHolidays: [] },
          milestoneInput: { type: 'dates', value: { startDate: '', endDate: '' } },
        }),
        milestone('scheduler-4', 'scheduler'),
      ],
    })

    expect(result).toEqual({ status: 'incomplete_window' })
  })
})
