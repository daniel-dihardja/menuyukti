import { describe, expect, it } from 'vitest'

import {
  buildSchedulerMonth,
  buildSchedulerWeek,
  canGoToNextMonth,
  canGoToNextWeek,
  canGoToPreviousMonth,
  canGoToPreviousWeek,
  clampMonthStart,
  clampWeekStart,
  eachIsoDateInWindow,
  isoDateOnlyFromDate,
  resolveSchedulerPostDetail,
  schedulerHourIndexFromTime,
  schedulerHourLabels,
  schedulerSlotClassName,
  schedulerSlotDisplayTime,
  schedulerSlotDisplayTitle,
  schedulerSlotKind,
  schedulerSlotsByDate,
  schedulerSlotsForDate,
  schedulerSlotsForDateDetail,
  SCHEDULER_HAPPY_HOLIDAY_STORY_TIME,
  SCHEDULER_MONTHLY_PIN_POST_TIME,
  SCHEDULER_REEL_LUNCH_OFFER_TIME,
  SCHEDULER_MONTH_GRID_DAYS,
  startOfMonth,
  startOfWeekMonday,
  weekStartIsoForDay,
  weekStartIsoForMonth,
  monthStartIsoForWeek,
} from '@/lib/milestones/scheduler-calendar'
import { parseIsoDateOnly } from '@/lib/milestones/scheduler-dates'

const samplePostDetail = {
  id: 'pinned-monthly-menu',
  format: 'carousel' as const,
  intent: 'pinned_monthly_menu' as const,
  title: 'Monthly top menu',
  groupIds: ['group-1'],
  slides: [
    {
      dishName: 'Ribeye',
      imageBrief: 'Hero menu photography brief.',
    },
  ],
}

describe('resolveSchedulerPostDetail', () => {
  it('returns embedded post detail from the slot', () => {
    expect(
      resolveSchedulerPostDetail(
        {
          kind: 'post',
          date: '2026-06-01',
          time: '10:00',
          title: 'Monthly top menu',
          post: samplePostDetail,
        },
        [],
      ),
    ).toEqual(samplePostDetail)
  })

  it('falls back to post_lineup posts matched by title', () => {
    expect(
      resolveSchedulerPostDetail(
        {
          kind: 'post',
          date: '2026-06-01',
          time: '10:00',
          title: 'Monthly top menu',
        },
        [samplePostDetail],
      ),
    ).toEqual(samplePostDetail)
  })

  it('merges description and captionGuidance from post_lineup when embedded post lacks copy', () => {
    const postLineupWithCopy = {
      ...samplePostDetail,
      description: 'Monthly pin concept summary.',
      captionGuidance: 'Lead with hero mains and a reservation CTA.',
    }
    expect(
      resolveSchedulerPostDetail(
        {
          kind: 'post',
          date: '2026-06-01',
          time: '10:00',
          title: 'Monthly top menu',
          post: samplePostDetail,
        },
        [postLineupWithCopy],
      ),
    ).toEqual(postLineupWithCopy)
  })

  it('prefers embedded description and captionGuidance over post_lineup fallback', () => {
    const embedded = {
      ...samplePostDetail,
      description: 'Embedded description.',
      captionGuidance: 'Embedded caption guidance.',
    }
    const fallback = {
      ...samplePostDetail,
      description: 'Fallback description.',
      captionGuidance: 'Fallback caption guidance.',
    }
    expect(
      resolveSchedulerPostDetail(
        {
          kind: 'post',
          date: '2026-06-01',
          time: '10:00',
          title: 'Monthly top menu',
          post: embedded,
        },
        [fallback],
      ),
    ).toEqual(embedded)
  })

  it('returns undefined for non-post slots', () => {
    expect(
      resolveSchedulerPostDetail(
        {
          kind: 'reel',
          date: '2026-06-02',
          time: '11:00',
          title: 'Reel: Lunch offer',
        },
        [samplePostDetail],
      ),
    ).toBeUndefined()
  })
})

describe('schedulerHourIndexFromTime', () => {
  it('maps 10:00 to index 2 when the grid starts at 8', () => {
    expect(schedulerHourIndexFromTime(SCHEDULER_HAPPY_HOLIDAY_STORY_TIME)).toBe(2)
  })

  it('returns undefined for times outside the visible grid', () => {
    expect(schedulerHourIndexFromTime('07:00')).toBeUndefined()
    expect(schedulerHourIndexFromTime('22:00')).toBeUndefined()
  })
})

describe('schedulerSlotKind', () => {
  it('returns the explicit post slot kind', () => {
    expect(
      schedulerSlotKind({
        kind: 'post',
        date: '2026-06-01',
        time: '10:00',
        title: 'Post: monthly top menu',
      }),
    ).toBe('post')
  })

  it('returns the explicit story slot kind', () => {
    expect(
      schedulerSlotKind({
        kind: 'story',
        date: '2026-06-15',
        time: '10:00',
        title: 'Story: sending happy Easter Sunday',
      }),
    ).toBe('story')
  })

  it('returns the explicit reel slot kind', () => {
    expect(
      schedulerSlotKind({
        kind: 'reel',
        date: '2026-06-16',
        time: '11:00',
        title: 'Reel: Ribeye lunch offer (11:00-14:00) [hero]',
      }),
    ).toBe('reel')
  })
})

describe('schedulerSlotClassName', () => {
  it('returns distinct classes for post, story, and reel slots', () => {
    const storyClass = schedulerSlotClassName('story')
    const postClass = schedulerSlotClassName('post')
    const reelClass = schedulerSlotClassName('reel')
    expect(storyClass).toContain('violet')
    expect(postClass).toContain('sky')
    expect(reelClass).toContain('orange')
    expect(storyClass).not.toEqual(postClass)
    expect(reelClass).not.toEqual(postClass)
  })
})

describe('schedulerSlotDisplayTitle', () => {
  it('formats post entries as "Post: <name>"', () => {
    expect(
      schedulerSlotDisplayTitle({
        kind: 'post',
        date: '2026-06-01',
        time: '10:00',
        title: 'Monthly top menu',
      }),
    ).toBe('Post: Monthly top menu')
  })

  it('rebuilds prefixed titles without double-prefixing', () => {
    expect(
      schedulerSlotDisplayTitle({
        kind: 'reel',
        date: '2026-06-02',
        time: '11:00',
        title: 'Reel: Lunch Offer',
      }),
    ).toBe('Reel: Lunch Offer')
  })

  it('uses the explicit slot kind when the raw title does not include one', () => {
    expect(
      schedulerSlotDisplayTitle({
        kind: 'story',
        date: '2026-06-15',
        time: '10:00',
        title: 'Public holiday greetings',
      }),
    ).toBe('Story: Public holiday greetings')
  })
})

describe('schedulerSlotDisplayTime', () => {
  it('keeps explicit times from scheduler slots', () => {
    expect(
      schedulerSlotDisplayTime({
        kind: 'reel',
        date: '2026-06-03',
        time: '09:30',
        title: 'Breakfast offer',
      }),
    ).toBe('09:30')
  })

  it('falls back to the requested preview defaults when time is blank', () => {
    expect(
      schedulerSlotDisplayTime({
        kind: 'post',
        date: '2026-06-01',
        time: '',
        title: 'Monthly top menu',
      }),
    ).toBe(SCHEDULER_MONTHLY_PIN_POST_TIME)

    expect(
      schedulerSlotDisplayTime({
        kind: 'reel',
        date: '2026-06-02',
        time: '',
        title: 'Lunch offer',
      }),
    ).toBe(SCHEDULER_REEL_LUNCH_OFFER_TIME)

    expect(
      schedulerSlotDisplayTime({
        kind: 'story',
        date: '2026-06-15',
        time: '',
        title: 'Public holiday greetings',
      }),
    ).toBe(SCHEDULER_HAPPY_HOLIDAY_STORY_TIME)
  })
})

describe('schedulerSlotsForDate', () => {
  const slots = [
    {
      kind: 'story' as const,
      date: '2026-06-15',
      time: '10:00',
      title: 'Story: sending happy Easter Sunday',
    },
    {
      kind: 'reel' as const,
      date: '2026-06-20',
      time: '10:00',
      title: 'Reel: Burger lunch offer (11:00-14:00) [proof]',
    },
  ]

  it('filters slots for a single day', () => {
    expect(schedulerSlotsForDate(slots, '2026-06-15')).toEqual([slots[0]])
  })

  it('groups slots by date', () => {
    const grouped = schedulerSlotsByDate(slots)
    expect(grouped.get('2026-06-15')).toEqual([slots[0]])
    expect(grouped.get('2026-06-20')).toEqual([slots[1]])
  })
})

describe('schedulerSlotsForDateDetail', () => {
  it('sorts selected-day slots by time and then title', () => {
    const slots = [
      {
        kind: 'story' as const,
        date: '2026-06-15',
        time: '',
        title: 'Public holiday greetings',
      },
      {
        kind: 'reel' as const,
        date: '2026-06-15',
        time: '',
        title: 'Lunch offer',
      },
      {
        kind: 'post' as const,
        date: '2026-06-15',
        time: '10:00',
        title: 'Monthly top menu',
      },
    ]

    expect(schedulerSlotsForDateDetail(slots, '2026-06-15').map((slot) => slot.kind)).toEqual([
      'post',
      'story',
      'reel',
    ])
  })
})

describe('isoDateOnlyFromDate', () => {
  it('formats local dates as YYYY-MM-DD', () => {
    expect(isoDateOnlyFromDate(new Date(2026, 5, 14))).toBe('2026-06-14')
  })
})

describe('eachIsoDateInWindow', () => {
  it('returns inclusive date list', () => {
    expect(eachIsoDateInWindow('2026-06-01', '2026-06-03')).toEqual([
      '2026-06-01',
      '2026-06-02',
      '2026-06-03',
    ])
  })

  it('returns empty list for invalid windows', () => {
    expect(eachIsoDateInWindow('2026-06-10', '2026-06-01')).toEqual([])
  })
})

describe('startOfWeekMonday', () => {
  it('anchors Sunday to the previous Monday', () => {
    const sunday = new Date(2026, 5, 14)
    expect(sunday.getDay()).toBe(0)
    expect(isoDateOnlyFromDate(startOfWeekMonday(sunday))).toBe('2026-06-08')
  })

  it('anchors Wednesday to the same week Monday', () => {
    const wednesday = new Date(2026, 5, 10)
    expect(isoDateOnlyFromDate(startOfWeekMonday(wednesday))).toBe('2026-06-08')
  })
})

describe('clampWeekStart', () => {
  it('clamps to the first week that intersects the window', () => {
    const anchor = parseIsoDateOnly('2026-05-25')!
    expect(clampWeekStart(anchor, '2026-06-01', '2026-06-30')).toBe('2026-06-01')
  })

  it('clamps to the last valid week when the anchor is after the window', () => {
    const anchor = parseIsoDateOnly('2026-07-15')!
    expect(clampWeekStart(anchor, '2026-06-01', '2026-06-10')).toBe('2026-06-08')
  })
})

describe('buildSchedulerWeek', () => {
  it('marks in-window days and returns seven columns', () => {
    const week = buildSchedulerWeek('2026-05-25', '2026-06-01', '2026-06-30')
    expect(week).toHaveLength(7)
    expect(week.map((day) => day.isoDate)).toEqual([
      '2026-05-25',
      '2026-05-26',
      '2026-05-27',
      '2026-05-28',
      '2026-05-29',
      '2026-05-30',
      '2026-05-31',
    ])
    expect(week.filter((day) => day.inWindow).map((day) => day.isoDate)).toEqual([])
  })

  it('flags partial weeks at the window edge', () => {
    const week = buildSchedulerWeek('2026-06-01', '2026-06-01', '2026-06-05')
    expect(week.filter((day) => day.inWindow).map((day) => day.isoDate)).toEqual([
      '2026-06-01',
      '2026-06-02',
      '2026-06-03',
      '2026-06-04',
      '2026-06-05',
    ])
  })
})

describe('schedulerHourLabels', () => {
  it('returns one label per visible hour', () => {
    expect(schedulerHourLabels('en-US', 8, 22)).toHaveLength(14)
    expect(schedulerHourLabels('en-US', 8, 22)[0]).toMatch(/8/)
  })
})

describe('week navigation helpers', () => {
  it('disables previous week at the first valid week', () => {
    expect(canGoToPreviousWeek('2026-06-01', '2026-06-01', '2026-06-30')).toBe(false)
    expect(canGoToPreviousWeek('2026-06-08', '2026-06-01', '2026-06-30')).toBe(true)
  })

  it('disables next week at the last valid week', () => {
    expect(canGoToNextWeek('2026-06-29', '2026-06-01', '2026-06-30')).toBe(false)
    expect(canGoToNextWeek('2026-06-22', '2026-06-01', '2026-06-30')).toBe(true)
  })
})

describe('buildSchedulerMonth', () => {
  it('returns 42 cells starting on Monday', () => {
    const month = buildSchedulerMonth('2026-06-01', '2026-06-01', '2026-06-30')
    expect(month).toHaveLength(SCHEDULER_MONTH_GRID_DAYS)
    expect(month[0]?.isoDate).toBe('2026-06-01')
    expect(month[6]?.isoDate).toBe('2026-06-07')
  })

  it('marks in-month and in-window days for partial windows', () => {
    const month = buildSchedulerMonth('2026-03-01', '2026-03-10', '2026-03-20')
    const marchFirst = month.find((day) => day.isoDate === '2026-03-01')
    const febPadding = month.find((day) => day.isoDate === '2026-02-23')
    const inWindow = month.find((day) => day.isoDate === '2026-03-15')
    const outWindow = month.find((day) => day.isoDate === '2026-03-25')

    expect(marchFirst?.inMonth).toBe(true)
    expect(febPadding?.inMonth).toBe(false)
    expect(inWindow?.inWindow).toBe(true)
    expect(outWindow?.inWindow).toBe(false)
  })
})

describe('clampMonthStart', () => {
  it('clamps to the first month that intersects the window', () => {
    const anchor = parseIsoDateOnly('2026-05-15')!
    expect(clampMonthStart(anchor, '2026-06-01', '2026-06-30')).toBe('2026-06-01')
  })

  it('clamps to the last valid month when the anchor is after the window', () => {
    const anchor = parseIsoDateOnly('2026-08-01')!
    expect(clampMonthStart(anchor, '2026-06-01', '2026-06-30')).toBe('2026-06-01')
  })
})

describe('month navigation helpers', () => {
  it('disables previous month at the first valid month', () => {
    expect(canGoToPreviousMonth('2026-06-01', '2026-06-01', '2026-06-30')).toBe(false)
    expect(canGoToPreviousMonth('2026-07-01', '2026-06-01', '2026-07-31')).toBe(true)
  })

  it('disables next month at the last valid month', () => {
    expect(canGoToNextMonth('2026-06-01', '2026-06-01', '2026-06-30')).toBe(false)
    expect(canGoToNextMonth('2026-06-01', '2026-06-01', '2026-07-31')).toBe(true)
  })
})

describe('weekStartIsoForDay', () => {
  it('returns the Monday of the clicked day clamped to the window', () => {
    expect(weekStartIsoForDay('2026-06-10', '2026-06-01', '2026-06-30')).toBe('2026-06-08')
  })

  it('clamps drill-down when the week starts before the window', () => {
    expect(weekStartIsoForDay('2026-06-02', '2026-06-01', '2026-06-30')).toBe('2026-06-01')
  })
})

describe('startOfMonth', () => {
  it('returns the first day of the month', () => {
    expect(isoDateOnlyFromDate(startOfMonth(new Date(2026, 5, 14)))).toBe('2026-06-01')
  })
})

describe('view sync helpers', () => {
  it('derives month start from the visible week', () => {
    expect(monthStartIsoForWeek('2026-06-08')).toBe('2026-06-01')
  })

  it('keeps the current week when switching to week view in the same month', () => {
    expect(weekStartIsoForMonth('2026-06-01', '2026-06-08', '2026-06-01', '2026-06-30')).toBe(
      '2026-06-08',
    )
  })

  it('snaps to the first in-window week when the current week is outside the month', () => {
    expect(weekStartIsoForMonth('2026-07-01', '2026-06-08', '2026-06-01', '2026-07-31')).toBe(
      '2026-06-29',
    )
  })
})
