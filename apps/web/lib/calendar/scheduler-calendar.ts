import { parseIsoDateOnly } from '@/lib/calendar/scheduler-dates'

export const SCHEDULER_GRID_HOUR_START = 8
export const SCHEDULER_GRID_HOUR_END = 22
export const SCHEDULER_GRID_SLOT_MINUTES = 60
export const SCHEDULER_MONTHLY_PIN_POST_TIME = '10:00'
export const SCHEDULER_WEEKLY_LUNCH_POST_TIME = '10:00'
export const SCHEDULER_REEL_LUNCH_OFFER_TIME = '11:00'
export const SCHEDULER_HAPPY_HOLIDAY_STORY_TIME = '10:00'

export type SchedulerSlotKind = 'story' | 'post' | 'reel'

/** Slot shape for calendar grids (workflow milestone slots and manual entries). */
export type SchedulerSlot = {
  kind?: SchedulerSlotKind | null
  date: string
  time: string
  title: string
  id?: string | null
  description?: string | null
  mediaRefs?: Array<{ kind: string; name: string }> | null
  source?: string | null
}

const SCHEDULER_SLOT_CLASS = {
  story:
    'border-chart-4/45 bg-chart-4/20 text-foreground dark:border-chart-4/50 dark:bg-chart-4/25',
  post: 'border-chart-2/45 bg-chart-2/20 text-foreground dark:border-chart-2/50 dark:bg-chart-2/25',
  reel: 'border-chart-3/50 bg-chart-3/25 text-foreground dark:border-chart-3/55 dark:bg-chart-3/30',
} as const

const SCHEDULER_EVENT_SLOT_CLASS = 'border-border/80 bg-muted/60 text-foreground dark:bg-muted/40'

/** Weekend column/day wash — brand orange, not Tailwind amber. */
export const SCHEDULER_WEEKEND_HEADER_CLASS =
  'bg-chart-3/25 text-foreground dark:bg-chart-3/30 dark:text-foreground'
export const SCHEDULER_WEEKEND_DAY_CLASS = 'bg-chart-3/10 dark:bg-chart-3/15'

/** Public holiday badge — semantic destructive soft, not Tailwind rose. */
export const SCHEDULER_HOLIDAY_BADGE_CLASS =
  'rounded-sm border border-destructive/30 bg-destructive/10 font-semibold uppercase tracking-wide text-destructive dark:border-destructive/40 dark:bg-destructive/15 dark:text-destructive'

const SCHEDULER_SLOT_TITLE_PREFIX = /^(post|reel|story):\s*/i
const SCHEDULER_SLOT_FALLBACK_TIME: Record<SchedulerSlotKind, string> = {
  story: SCHEDULER_HAPPY_HOLIDAY_STORY_TIME,
  post: SCHEDULER_MONTHLY_PIN_POST_TIME,
  reel: SCHEDULER_REEL_LUNCH_OFFER_TIME,
}
const SCHEDULER_EVENT_FALLBACK_TIME = '10:00'

function inferSchedulerSlotKindFromTitle(title: string): SchedulerSlotKind {
  const trimmed = title.trimStart()
  if (trimmed.startsWith('Post:')) {
    return 'post'
  }
  if (trimmed.startsWith('Reel:')) {
    return 'reel'
  }
  return 'story'
}

/** Instagram format for workflow slots; `null` for generic/manual calendar events. */
export function schedulerSlotKind(slot: SchedulerSlot): SchedulerSlotKind | null {
  if (slot.kind) {
    return slot.kind
  }
  if (slot.source === 'manual') {
    return null
  }
  return inferSchedulerSlotKindFromTitle(slot.title)
}

export function schedulerSlotClassName(kind: SchedulerSlotKind | null): string {
  if (!kind) {
    return SCHEDULER_EVENT_SLOT_CLASS
  }
  return SCHEDULER_SLOT_CLASS[kind]
}

export function schedulerSlotTypeLabel(kind: SchedulerSlotKind): string {
  switch (kind) {
    case 'post':
      return 'Post'
    case 'reel':
      return 'Reel'
    case 'story':
      return 'Story'
  }
}

function schedulerSlotName(title: string): string {
  const trimmed = title.trim()
  const normalized = trimmed.replace(SCHEDULER_SLOT_TITLE_PREFIX, '').trim()
  return normalized || trimmed
}

export function schedulerSlotDisplayTitleParts(slot: SchedulerSlot): {
  typeLabel: string | null
  name: string
} {
  const kind = schedulerSlotKind(slot)
  if (!kind) {
    return { typeLabel: null, name: slot.title.trim() }
  }
  return {
    typeLabel: schedulerSlotTypeLabel(kind),
    name: schedulerSlotName(slot.title),
  }
}

export function schedulerSlotDisplayTitle(slot: SchedulerSlot): string {
  const { typeLabel, name } = schedulerSlotDisplayTitleParts(slot)
  if (!typeLabel) {
    return name
  }
  return name ? `${typeLabel}: ${name}` : typeLabel
}

export function schedulerSlotDisplayTime(slot: SchedulerSlot): string {
  const trimmed = slot.time.trim()
  if (trimmed) {
    return trimmed
  }
  const kind = schedulerSlotKind(slot)
  if (!kind) {
    return SCHEDULER_EVENT_FALLBACK_TIME
  }
  return SCHEDULER_SLOT_FALLBACK_TIME[kind]
}

function schedulerTimeSortValue(time: string): number {
  const match = /^(\d{1,2}):(\d{2})$/.exec(time.trim())
  if (!match) {
    return Number.POSITIVE_INFINITY
  }
  const hour = Number(match[1])
  const minute = Number(match[2])
  if (
    !Number.isInteger(hour) ||
    !Number.isInteger(minute) ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    return Number.POSITIVE_INFINITY
  }
  return hour * 60 + minute
}

export type SchedulerWeekDay = {
  isoDate: string
  inWindow: boolean
  isToday: boolean
}

export type SchedulerMonthDay = {
  isoDate: string
  inWindow: boolean
  inMonth: boolean
  isToday: boolean
}

export const SCHEDULER_MONTH_GRID_DAYS = 42

export function schedulerHourIndexFromTime(
  time: string,
  startHour = SCHEDULER_GRID_HOUR_START,
  endHour = SCHEDULER_GRID_HOUR_END,
): number | undefined {
  const trimmed = time.trim()
  const match = /^(\d{1,2}):(\d{2})$/.exec(trimmed)
  if (!match) {
    return undefined
  }

  const hour = Number(match[1])
  const minute = Number(match[2])
  if (
    !Number.isInteger(hour) ||
    !Number.isInteger(minute) ||
    minute < 0 ||
    minute > 59 ||
    hour < startHour ||
    hour >= endHour
  ) {
    return undefined
  }

  return hour - startHour
}

export function schedulerSlotsForDate(slots: SchedulerSlot[], isoDate: string): SchedulerSlot[] {
  return slots.filter((slot) => slot.date === isoDate)
}

export function schedulerSlotsForDateDetail(
  slots: SchedulerSlot[],
  isoDate: string,
): SchedulerSlot[] {
  return schedulerSlotsForDate(slots, isoDate).toSorted((left, right) => {
    const leftKind = schedulerSlotKind(left)
    const rightKind = schedulerSlotKind(right)
    const leftLabel = leftKind ? schedulerSlotTypeLabel(leftKind) : ''
    const rightLabel = rightKind ? schedulerSlotTypeLabel(rightKind) : ''
    return (
      schedulerTimeSortValue(schedulerSlotDisplayTime(left)) -
        schedulerTimeSortValue(schedulerSlotDisplayTime(right)) ||
      leftLabel.localeCompare(rightLabel) ||
      schedulerSlotDisplayTitle(left).localeCompare(schedulerSlotDisplayTitle(right))
    )
  })
}

export function schedulerSlotsByDate(slots: SchedulerSlot[]): Map<string, SchedulerSlot[]> {
  const grouped = new Map<string, SchedulerSlot[]>()
  for (const slot of slots) {
    const existing = grouped.get(slot.date)
    if (existing) {
      existing.push(slot)
    } else {
      grouped.set(slot.date, [slot])
    }
  }
  return grouped
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

export function startOfMonth(date: Date): Date {
  const result = new Date(date.getFullYear(), date.getMonth(), 1)
  result.setHours(0, 0, 0, 0)
  return result
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

function monthBounds(
  windowStart: string,
  windowEnd: string,
): { minMonth: Date; maxMonth: Date } | null {
  const windowStartDate = parseIsoDateOnly(windowStart)
  const windowEndDate = parseIsoDateOnly(windowEnd)
  if (!windowStartDate || !windowEndDate) {
    return null
  }

  return {
    minMonth: startOfMonth(windowStartDate),
    maxMonth: startOfMonth(windowEndDate),
  }
}

export function clampMonthStart(monthStart: Date, windowStart: string, windowEnd: string): string {
  const bounds = monthBounds(windowStart, windowEnd)
  if (!bounds) {
    return isoDateOnlyFromDate(startOfMonth(monthStart))
  }

  let cursor = startOfMonth(monthStart)
  if (cursor < bounds.minMonth) {
    cursor = bounds.minMonth
  }
  if (cursor > bounds.maxMonth) {
    cursor = bounds.maxMonth
  }

  return isoDateOnlyFromDate(cursor)
}

export function buildSchedulerMonth(
  monthAnchorIso: string,
  windowStart: string,
  windowEnd: string,
): SchedulerMonthDay[] {
  const monthAnchor = parseIsoDateOnly(monthAnchorIso)
  if (!monthAnchor) {
    return []
  }

  const monthStart = startOfMonth(monthAnchor)
  const gridStart = startOfWeekMonday(monthStart)
  const todayIso = isoDateOnlyFromDate(new Date())
  const windowDates = new Set(eachIsoDateInWindow(windowStart, windowEnd))
  const anchorMonth = monthStart.getMonth()
  const anchorYear = monthStart.getFullYear()

  return Array.from({ length: SCHEDULER_MONTH_GRID_DAYS }, (_, index) => {
    const date = addDays(gridStart, index)
    const isoDate = isoDateOnlyFromDate(date)
    return {
      isoDate,
      inWindow: windowDates.has(isoDate),
      inMonth: date.getMonth() === anchorMonth && date.getFullYear() === anchorYear,
      isToday: isoDate === todayIso,
    }
  })
}

export function canGoToPreviousMonth(
  monthStartIso: string,
  windowStart: string,
  windowEnd: string,
): boolean {
  const monthStart = parseIsoDateOnly(monthStartIso)
  const bounds = monthBounds(windowStart, windowEnd)
  if (!monthStart || !bounds) {
    return false
  }
  return startOfMonth(monthStart) > bounds.minMonth
}

export function canGoToNextMonth(
  monthStartIso: string,
  windowStart: string,
  windowEnd: string,
): boolean {
  const monthStart = parseIsoDateOnly(monthStartIso)
  const bounds = monthBounds(windowStart, windowEnd)
  if (!monthStart || !bounds) {
    return false
  }
  return startOfMonth(monthStart) < bounds.maxMonth
}

export function previousMonthStartIso(monthStartIso: string): string {
  const monthStart = parseIsoDateOnly(monthStartIso)
  if (!monthStart) {
    return monthStartIso
  }
  return isoDateOnlyFromDate(new Date(monthStart.getFullYear(), monthStart.getMonth() - 1, 1))
}

export function nextMonthStartIso(monthStartIso: string): string {
  const monthStart = parseIsoDateOnly(monthStartIso)
  if (!monthStart) {
    return monthStartIso
  }
  return isoDateOnlyFromDate(new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 1))
}

export function formatSchedulerMonthLabel(monthStartIso: string, locale: string): string {
  const monthStart = parseIsoDateOnly(monthStartIso)
  if (!monthStart) {
    return monthStartIso
  }

  return new Intl.DateTimeFormat(locale, {
    month: 'long',
    year: 'numeric',
  }).format(monthStart)
}

export function weekStartIsoForDay(dayIso: string, windowStart: string, windowEnd: string): string {
  const day = parseIsoDateOnly(dayIso)
  if (!day) {
    return dayIso
  }
  return clampWeekStart(startOfWeekMonday(day), windowStart, windowEnd)
}

export function monthStartIsoForWeek(weekStartIso: string): string {
  const weekStart = parseIsoDateOnly(weekStartIso)
  if (!weekStart) {
    return weekStartIso
  }
  return isoDateOnlyFromDate(startOfMonth(weekStart))
}

export function weekStartIsoForMonth(
  monthStartIso: string,
  currentWeekStartIso: string,
  windowStart: string,
  windowEnd: string,
): string {
  const monthStart = parseIsoDateOnly(monthStartIso)
  const currentWeekStart = parseIsoDateOnly(currentWeekStartIso)
  if (monthStart && currentWeekStart) {
    const inSameMonth =
      currentWeekStart.getFullYear() === monthStart.getFullYear() &&
      currentWeekStart.getMonth() === monthStart.getMonth()
    if (inSameMonth) {
      return clampWeekStart(startOfWeekMonday(currentWeekStart), windowStart, windowEnd)
    }
  }

  const firstInWindowDay = buildSchedulerMonth(monthStartIso, windowStart, windowEnd).find(
    (day) => day.inWindow && day.inMonth,
  )
  if (firstInWindowDay) {
    return weekStartIsoForDay(firstInWindowDay.isoDate, windowStart, windowEnd)
  }

  if (!monthStart) {
    return currentWeekStartIso
  }
  return clampWeekStart(startOfWeekMonday(monthStart), windowStart, windowEnd)
}

export function schedulerWeekdayLabels(locale: string): string[] {
  const monday = new Date(2026, 0, 5)
  return Array.from({ length: 7 }, (_, index) =>
    new Intl.DateTimeFormat(locale, { weekday: 'short' })
      .format(addDays(monday, index))
      .replace(/\.+$/, '')
      .trim(),
  )
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
