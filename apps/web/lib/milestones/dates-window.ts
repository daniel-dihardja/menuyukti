/** Campaign window week enumeration for post lineup validation (mirrors agents dates_window.py). */

export type WeekdayName =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday'

const INDEX_WEEKDAY: WeekdayName[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
]

const WEEKDAY_INDEX: Record<WeekdayName, number> = {
  monday: 0,
  tuesday: 1,
  wednesday: 2,
  thursday: 3,
  friday: 4,
  saturday: 5,
  sunday: 6,
}

export type CampaignWeek = {
  weekIndex: number
  weekStart: string
  weekEnd: string
  postDate: string
}

export function parseIsoDateOnly(value: string): Date | null {
  const text = value.trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return null
  }
  const [year, month, day] = text.split('-').map(Number)
  const date = new Date(year!, month! - 1, day)
  if (date.getFullYear() !== year || date.getMonth() !== month! - 1 || date.getDate() !== day) {
    return null
  }
  date.setHours(0, 0, 0, 0)
  return date
}

export function isoDateOnlyFromDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function startOfWeekMonday(date: Date): Date {
  const result = new Date(date)
  const day = result.getDay()
  const diff = day === 0 ? -6 : 1 - day
  result.setDate(result.getDate() + diff)
  result.setHours(0, 0, 0, 0)
  return result
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

function jsWeekdayIndex(date: Date): number {
  return (date.getDay() + 6) % 7
}

function pickPostDate(
  weekStart: Date,
  weekEnd: Date,
  windowStart: Date,
  windowEnd: Date,
  preferredWeekdays: WeekdayName[],
): string | null {
  const preferredIndexes = preferredWeekdays.map((day) => WEEKDAY_INDEX[day])
  const rangeStart = weekStart > windowStart ? weekStart : windowStart
  const rangeEnd = weekEnd < windowEnd ? weekEnd : windowEnd
  if (rangeStart > rangeEnd) {
    return null
  }

  const cursor = new Date(rangeStart)
  while (cursor <= rangeEnd) {
    if (preferredIndexes.includes(jsWeekdayIndex(cursor))) {
      return isoDateOnlyFromDate(cursor)
    }
    cursor.setDate(cursor.getDate() + 1)
  }
  return null
}

export function campaignWeeks(startDate: string, endDate: string): CampaignWeek[] {
  const windowStart = parseIsoDateOnly(startDate)
  const windowEnd = parseIsoDateOnly(endDate)
  if (!windowStart || !windowEnd || windowStart > windowEnd) {
    return []
  }

  const preferredWeekdays: WeekdayName[] = ['thursday']
  const minWeek = startOfWeekMonday(windowStart)
  const maxWeek = startOfWeekMonday(windowEnd)

  const weeks: CampaignWeek[] = []
  let cursor = new Date(minWeek)
  let weekIndex = 1
  while (cursor <= maxWeek) {
    const weekStart = new Date(cursor)
    const weekEnd = addDays(weekStart, 6)
    const postDate = pickPostDate(weekStart, weekEnd, windowStart, windowEnd, preferredWeekdays)
    if (postDate) {
      weeks.push({
        weekIndex,
        weekStart: isoDateOnlyFromDate(weekStart),
        weekEnd: isoDateOnlyFromDate(weekEnd < windowEnd ? weekEnd : windowEnd),
        postDate,
      })
      weekIndex += 1
    }
    cursor = addDays(cursor, 7)
  }
  return weeks
}

export function countCampaignWeeks(startDate: string, endDate: string): number {
  return campaignWeeks(startDate, endDate).length
}

export function weekdayNameFromDate(date: Date): WeekdayName {
  return INDEX_WEEKDAY[jsWeekdayIndex(date)] ?? 'thursday'
}

export function preferredTimeForStrategy(strategyFocus: string): string {
  const focus = strategyFocus.trim().toLowerCase()
  if (focus.includes('weekend')) {
    return '09:30'
  }
  if (focus.includes('evening') || focus.includes('dinner')) {
    return '17:30'
  }
  return '10:00'
}

export function weekStartIsoForDate(isoDate: string): string | null {
  const date = parseIsoDateOnly(isoDate)
  if (!date) {
    return null
  }
  return isoDateOnlyFromDate(startOfWeekMonday(date))
}
