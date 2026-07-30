import { describe, expect, it } from 'vitest'

import { parseIsoDateOnly } from '@/lib/calendar/scheduler-dates'

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
