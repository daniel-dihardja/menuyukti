import { parseIsoDateOnly } from '@/lib/milestones/scheduler-dates'
import type {
  PostLineupPost,
  ReelLineupReel,
  SchedulerMilestoneData,
} from '@/lib/graphql/node-schemas'

export const SCHEDULER_GRID_HOUR_START = 8
export const SCHEDULER_GRID_HOUR_END = 22
export const SCHEDULER_GRID_SLOT_MINUTES = 60
export const SCHEDULER_MONTHLY_PIN_POST_TIME = '10:00'
export const SCHEDULER_WEEKLY_LUNCH_POST_TIME = '10:00'
export const SCHEDULER_REEL_LUNCH_OFFER_TIME = '11:00'
export const SCHEDULER_HAPPY_HOLIDAY_STORY_TIME = '10:00'

export type SchedulerSlot = SchedulerMilestoneData['slots'][number]

export type SchedulerSlotKind = 'story' | 'post' | 'reel'

const SCHEDULER_SLOT_CLASS = {
  story:
    'border-violet-200 bg-violet-50 text-violet-900 dark:border-violet-800 dark:bg-violet-950/60 dark:text-violet-100',
  post: 'border-sky-300/80 bg-sky-50/90 text-foreground dark:border-sky-500/50 dark:bg-sky-950/40',
  reel: 'border-orange-400 bg-orange-100 text-orange-950 dark:border-orange-600 dark:bg-orange-950/70 dark:text-orange-50',
} as const

const SCHEDULER_SLOT_TITLE_PREFIX = /^(post|reel|story):\s*/i
const SCHEDULER_SLOT_FALLBACK_TIME: Record<SchedulerSlotKind, string> = {
  story: SCHEDULER_HAPPY_HOLIDAY_STORY_TIME,
  post: SCHEDULER_MONTHLY_PIN_POST_TIME,
  reel: SCHEDULER_REEL_LUNCH_OFFER_TIME,
}

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

export function schedulerSlotKind(slot: SchedulerSlot): SchedulerSlotKind {
  if (slot.kind) {
    return slot.kind
  }
  if (slot.reel) {
    return 'reel'
  }
  if (slot.post) {
    return 'post'
  }
  return inferSchedulerSlotKindFromTitle(slot.title)
}

export function schedulerSlotClassName(kind: SchedulerSlotKind): string {
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
  typeLabel: string
  name: string
} {
  return {
    typeLabel: schedulerSlotTypeLabel(schedulerSlotKind(slot)),
    name: schedulerSlotName(slot.title),
  }
}

export function schedulerSlotDisplayTitle(slot: SchedulerSlot): string {
  const { typeLabel, name } = schedulerSlotDisplayTitleParts(slot)
  return name ? `${typeLabel}: ${name}` : typeLabel
}

export function schedulerSlotDisplayTime(slot: SchedulerSlot): string {
  const trimmed = slot.time.trim()
  if (trimmed) {
    return trimmed
  }
  return SCHEDULER_SLOT_FALLBACK_TIME[schedulerSlotKind(slot)]
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
  return schedulerSlotsForDate(slots, isoDate).toSorted(
    (left, right) =>
      schedulerTimeSortValue(schedulerSlotDisplayTime(left)) -
        schedulerTimeSortValue(schedulerSlotDisplayTime(right)) ||
      schedulerSlotTypeLabel(schedulerSlotKind(left)).localeCompare(
        schedulerSlotTypeLabel(schedulerSlotKind(right)),
      ) ||
      schedulerSlotDisplayTitle(left).localeCompare(schedulerSlotDisplayTitle(right)),
  )
}

function findPostLineupPostByTitle(
  postLineupPosts: PostLineupPost[] | undefined,
  title: string,
): PostLineupPost | undefined {
  if (!postLineupPosts?.length) {
    return undefined
  }
  const normalizedTitle = title.trim()
  return postLineupPosts.find((post) => post.title.trim() === normalizedTitle)
}

function mergeSchedulerPostCopy(
  embedded: PostLineupPost,
  fallback?: PostLineupPost,
): PostLineupPost {
  if (!fallback) {
    return embedded
  }
  const description = embedded.description?.trim() || fallback.description?.trim()
  const captionGuidance = embedded.captionGuidance?.trim() || fallback.captionGuidance?.trim()
  if (description === embedded.description && captionGuidance === embedded.captionGuidance) {
    return embedded
  }
  return {
    ...embedded,
    ...(description ? { description } : {}),
    ...(captionGuidance ? { captionGuidance } : {}),
  }
}

export function resolveSchedulerPostDetail(
  slot: SchedulerSlot,
  postLineupPosts?: PostLineupPost[],
): PostLineupPost | undefined {
  if (schedulerSlotKind(slot) !== 'post') {
    return undefined
  }
  const title = slot.title.trim()
  const fallback = findPostLineupPostByTitle(postLineupPosts, title)
  if (slot.post) {
    return mergeSchedulerPostCopy(slot.post, fallback)
  }
  return fallback
}

function schedulerReelTitleFromSlotTitle(title: string): string {
  const trimmed = title.trim()
  const normalized = trimmed.replace(/^reel:\s*/i, '').trim()
  return normalized || trimmed
}

function findReelLineupReelForSlot(
  reelLineupReels: ReelLineupReel[] | undefined,
  slot: SchedulerSlot,
): ReelLineupReel | undefined {
  if (!reelLineupReels?.length) {
    return undefined
  }
  const embeddedId = slot.reel?.id.trim()
  if (embeddedId) {
    const byId = reelLineupReels.find((reel) => reel.id === embeddedId)
    if (byId) {
      return byId
    }
  }
  const name = schedulerReelTitleFromSlotTitle(slot.title)
  return reelLineupReels.find((reel) => reel.title.trim() === name)
}

function mergeSchedulerReelCopy(
  embedded: ReelLineupReel,
  fallback?: ReelLineupReel,
): ReelLineupReel {
  if (!fallback) {
    return embedded
  }
  const description = embedded.description.trim() || fallback.description.trim()
  const explanation = embedded.explanation.trim() || fallback.explanation.trim()
  const heroDishes =
    embedded.heroDishes && embedded.heroDishes.length > 0
      ? embedded.heroDishes
      : fallback.heroDishes
  if (
    description === embedded.description &&
    explanation === embedded.explanation &&
    heroDishes === embedded.heroDishes
  ) {
    return embedded
  }
  return {
    ...embedded,
    description,
    explanation,
    ...(heroDishes ? { heroDishes } : {}),
  }
}

export function resolveSchedulerReelDetail(
  slot: SchedulerSlot,
  reelLineupReels?: ReelLineupReel[],
): ReelLineupReel | undefined {
  if (schedulerSlotKind(slot) !== 'reel') {
    return undefined
  }
  const fallback = findReelLineupReelForSlot(reelLineupReels, slot)
  if (slot.reel) {
    return mergeSchedulerReelCopy(slot.reel, fallback)
  }
  return fallback
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
