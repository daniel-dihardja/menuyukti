import {
  DAILY_HEATMAP_DEFAULT_END_HOUR,
  DAILY_HEATMAP_DEFAULT_START_HOUR,
} from '@/lib/heatmap-config'

export type OpeningHourLike = {
  openTime: string
  closeTime: string
}

export type DailyHeatmapHourRange = {
  startHour: number
  endHour: number
}

const DEFAULT_HOUR_RANGE: DailyHeatmapHourRange = {
  startHour: DAILY_HEATMAP_DEFAULT_START_HOUR,
  endHour: DAILY_HEATMAP_DEFAULT_END_HOUR,
}

function parseHourFromTime(time: string): number | null {
  const trimmed = time.trim()
  if (!trimmed) return null

  const match = /^(\d{1,2}):(\d{2})$/.exec(trimmed)
  if (!match) return null

  const hour = Number(match[1])
  if (!Number.isInteger(hour) || hour < 0 || hour > 23) return null

  return hour
}

/**
 * Derive the daily heatmap column range from a location's opening hours.
 * Uses the earliest open and latest close across all configured weekdays.
 * Falls back to static defaults when no valid hours are configured.
 */
export function deriveDailyHeatmapHourRange(
  openingHours: OpeningHourLike[],
): DailyHeatmapHourRange {
  const openHours: number[] = []
  const closeHours: number[] = []

  for (const entry of openingHours) {
    const open = parseHourFromTime(entry.openTime)
    const close = parseHourFromTime(entry.closeTime)
    if (open == null || close == null || open >= close) continue

    openHours.push(open)
    closeHours.push(close)
  }

  if (openHours.length === 0 || closeHours.length === 0) {
    return DEFAULT_HOUR_RANGE
  }

  const startHour = Math.min(...openHours)
  const endHour = Math.max(...closeHours)

  if (startHour > endHour) {
    return DEFAULT_HOUR_RANGE
  }

  return { startHour, endHour }
}
