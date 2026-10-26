import { describe, expect, it } from 'vitest'

import {
  classifyOpeningHoursSummary,
  defaultLocationOpeningHours,
  LOCATION_DEFAULT_CLOSE,
  LOCATION_DEFAULT_OPEN,
  openingHoursAreAllClosed,
  type OpeningHourRow,
  type Weekday,
} from '../../app/(protected)/analytics/locations/location-form-types'
import { defaultBriefHintsState, nextSuggestedBriefField } from '../../lib/location-quick-profile'

function openDay(
  day: Weekday,
  open = LOCATION_DEFAULT_OPEN,
  close = LOCATION_DEFAULT_CLOSE,
): OpeningHourRow {
  return { dayOfWeek: day, closed: false, openTime: open, closeTime: close }
}

describe('opening hours summary', () => {
  it('detects all closed', () => {
    const rows = defaultLocationOpeningHours()
    expect(openingHoursAreAllClosed(rows)).toBe(true)
    expect(classifyOpeningHoursSummary(rows)).toEqual({ kind: 'closedAll' })
  })

  it('detects weekday pattern', () => {
    const rows = defaultLocationOpeningHours().map((row) => {
      const isWeekday = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].includes(
        row.dayOfWeek,
      )
      return isWeekday ? openDay(row.dayOfWeek) : row
    })
    expect(classifyOpeningHoursSummary(rows)).toEqual({
      kind: 'weekdays',
      openTime: LOCATION_DEFAULT_OPEN,
      closeTime: LOCATION_DEFAULT_CLOSE,
    })
  })

  it('detects every-day pattern', () => {
    const rows = defaultLocationOpeningHours().map((row) => openDay(row.dayOfWeek))
    expect(classifyOpeningHoursSummary(rows)).toEqual({
      kind: 'everyDay',
      openTime: LOCATION_DEFAULT_OPEN,
      closeTime: LOCATION_DEFAULT_CLOSE,
    })
  })
})

describe('nextSuggestedBriefField', () => {
  it('suggests phone first on empty profile', () => {
    expect(nextSuggestedBriefField(defaultBriefHintsState())).toBe('phone')
  })

  it('skips filled fields in priority order', () => {
    const state = defaultBriefHintsState()
    state.phone = '+49 30'
    state.instagramHandle = 'venue'
    expect(nextSuggestedBriefField(state)).toBe('websiteUrl')
  })
})
