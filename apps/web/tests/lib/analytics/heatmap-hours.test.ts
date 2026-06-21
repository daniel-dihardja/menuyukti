import { describe, expect, it } from 'vitest'

import { deriveDailyHeatmapHourRange } from '@/lib/analytics/heatmap-hours'

describe('deriveDailyHeatmapHourRange', () => {
  it('returns earliest open and latest close across weekdays', () => {
    expect(
      deriveDailyHeatmapHourRange([
        { openTime: '08:00', closeTime: '18:00' },
        { openTime: '09:00', closeTime: '22:00' },
        { openTime: '10:00', closeTime: '20:00' },
      ]),
    ).toEqual({ startHour: 8, endHour: 22 })
  })

  it('falls back to defaults when opening hours are empty', () => {
    expect(deriveDailyHeatmapHourRange([])).toEqual({ startHour: 8, endHour: 22 })
  })

  it('falls back when entries are incomplete or invalid', () => {
    expect(
      deriveDailyHeatmapHourRange([
        { openTime: '', closeTime: '18:00' },
        { openTime: '09:00', closeTime: '' },
        { openTime: '22:00', closeTime: '08:00' },
      ]),
    ).toEqual({ startHour: 8, endHour: 22 })
  })

  it('uses a single weekday when only one day is configured', () => {
    expect(deriveDailyHeatmapHourRange([{ openTime: '07:30', closeTime: '15:00' }])).toEqual({
      startHour: 7,
      endHour: 15,
    })
  })
})
