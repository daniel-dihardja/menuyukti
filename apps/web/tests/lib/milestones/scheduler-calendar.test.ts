import { describe, expect, it } from 'vitest'

import {
  buildSchedulerWeek,
  canGoToNextWeek,
  canGoToPreviousWeek,
  clampWeekStart,
  eachIsoDateInWindow,
  isoDateOnlyFromDate,
  schedulerHourLabels,
  startOfWeekMonday,
} from '@/lib/milestones/scheduler-calendar'
import { parseIsoDateOnly } from '@/lib/milestones/scheduler-dates'

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
