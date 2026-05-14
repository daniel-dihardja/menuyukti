import { parseIsoDateOnly } from '@/lib/milestones/scheduler-dates'

export const SCHEDULER_GRID_HOUR_START = 8
export const SCHEDULER_GRID_HOUR_END = 22
export const SCHEDULER_GRID_SLOT_MINUTES = 60

export type SchedulerWeekDay = {
  isoDate: string
  inWindow: boolean
  isToday: boolean
}

export function isoDateOnlyFromDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function eachIsoDateInWindow(windowStart: string, windowEnd: string): string[] {
  const start = parseIsoDateOnly(windowStart)
  const end = parseIsoDateOnly(windowEnd)
  if (!start || !end || start > end) {
    return []
  }

  const dates: string[] = []
  const cursor = new Date(start)
  while (cursor <= end) {
    dates.push(isoDateOnlyFromDate(cursor))
    cursor.setDate(cursor.getDate() + 1)
  }
  return dates
}

export function startOfWeekMonday(date: Date): Date {
  const result = new Date(date)
  const day = result.getDay()
  const diff = day === 0 ? -6 : 1 - day
  result.setDate(result.getDate() + diff)
  result.setHours(0, 0, 0, 0)
  return result
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

export function clampWeekStart(weekStart: Date, windowStart: string, windowEnd: string): string {
  const windowStartDate = parseIsoDateOnly(windowStart)
  const windowEndDate = parseIsoDateOnly(windowEnd)
  if (!windowStartDate || !windowEndDate) {
    return isoDateOnlyFromDate(weekStart)
  }

  const minWeek = startOfWeekMonday(windowStartDate)
  const maxWeek = startOfWeekMonday(windowEndDate)
  let cursor = startOfWeekMonday(weekStart)

  if (cursor < minWeek) {
    cursor = minWeek
  }
  if (cursor > maxWeek) {
    cursor = maxWeek
  }

  return isoDateOnlyFromDate(cursor)
}

export function buildSchedulerWeek(
  weekStartIso: string,
  windowStart: string,
  windowEnd: string,
): SchedulerWeekDay[] {
  const weekStart = parseIsoDateOnly(weekStartIso)
  if (!weekStart) {
    return []
  }

  const todayIso = isoDateOnlyFromDate(new Date())
  const windowDates = new Set(eachIsoDateInWindow(windowStart, windowEnd))

  return Array.from({ length: 7 }, (_, index) => {
    const date = addDays(weekStart, index)
    const isoDate = isoDateOnlyFromDate(date)
    return {
      isoDate,
      inWindow: windowDates.has(isoDate),
      isToday: isoDate === todayIso,
    }
  })
}

export function schedulerHourLabels(
  locale: string,
  startHour = SCHEDULER_GRID_HOUR_START,
  endHour = SCHEDULER_GRID_HOUR_END,
): string[] {
  const formatter = new Intl.DateTimeFormat(locale, {
    hour: 'numeric',
    minute: '2-digit',
  })

  return Array.from({ length: endHour - startHour }, (_, index) => {
    const date = new Date(2000, 0, 1, startHour + index, 0, 0, 0)
    return formatter.format(date)
  })
}

function weekBounds(
  windowStart: string,
  windowEnd: string,
): { minWeek: Date; maxWeek: Date } | null {
  const windowStartDate = parseIsoDateOnly(windowStart)
  const windowEndDate = parseIsoDateOnly(windowEnd)
  if (!windowStartDate || !windowEndDate) {
    return null
  }

  return {
    minWeek: startOfWeekMonday(windowStartDate),
    maxWeek: startOfWeekMonday(windowEndDate),
  }
}

export function canGoToPreviousWeek(
  weekStartIso: string,
  windowStart: string,
  windowEnd: string,
): boolean {
  const weekStart = parseIsoDateOnly(weekStartIso)
  const bounds = weekBounds(windowStart, windowEnd)
  if (!weekStart || !bounds) {
    return false
  }
  return startOfWeekMonday(weekStart) > bounds.minWeek
}

export function canGoToNextWeek(
  weekStartIso: string,
  windowStart: string,
  windowEnd: string,
): boolean {
  const weekStart = parseIsoDateOnly(weekStartIso)
  const bounds = weekBounds(windowStart, windowEnd)
  if (!weekStart || !bounds) {
    return false
  }
  return startOfWeekMonday(weekStart) < bounds.maxWeek
}

export function previousWeekStartIso(weekStartIso: string): string {
  const weekStart = parseIsoDateOnly(weekStartIso)
  if (!weekStart) {
    return weekStartIso
  }
  return isoDateOnlyFromDate(addDays(weekStart, -7))
}

export function nextWeekStartIso(weekStartIso: string): string {
  const weekStart = parseIsoDateOnly(weekStartIso)
  if (!weekStart) {
    return weekStartIso
  }
  return isoDateOnlyFromDate(addDays(weekStart, 7))
}

export function formatSchedulerWeekRange(
  weekStartIso: string,
  locale: string,
): { start: string; end: string } {
  const weekStart = parseIsoDateOnly(weekStartIso)
  if (!weekStart) {
    return { start: weekStartIso, end: weekStartIso }
  }

  const weekEnd = addDays(weekStart, 6)
  const formatter = new Intl.DateTimeFormat(locale, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  return {
    start: formatter.format(weekStart),
    end: formatter.format(weekEnd),
  }
}
