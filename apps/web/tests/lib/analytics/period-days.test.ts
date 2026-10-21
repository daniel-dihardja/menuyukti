import { describe, expect, it } from 'vitest'

import { inclusiveCalendarDays } from '@/lib/analytics/period-days'

describe('inclusiveCalendarDays', () => {
  it('returns 1 for the same start and end day', () => {
    expect(inclusiveCalendarDays('2024-01-15', '2024-01-15')).toBe(1)
  })

  it('counts inclusive calendar days across a range', () => {
    expect(inclusiveCalendarDays('2024-01-01', '2024-01-10')).toBe(10)
    expect(inclusiveCalendarDays('2024-02-28', '2024-03-01')).toBe(3)
  })

  it('returns null when either date is missing', () => {
    expect(inclusiveCalendarDays(null, '2024-01-10')).toBeNull()
    expect(inclusiveCalendarDays('2024-01-01', null)).toBeNull()
    expect(inclusiveCalendarDays(undefined, undefined)).toBeNull()
  })

  it('returns null for invalid or inverted dates', () => {
    expect(inclusiveCalendarDays('not-a-date', '2024-01-10')).toBeNull()
    expect(inclusiveCalendarDays('2024-01-10', '2024-01-01')).toBeNull()
    expect(inclusiveCalendarDays('2024-02-30', '2024-03-01')).toBeNull()
  })
})
