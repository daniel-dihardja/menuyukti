import type {
  WeeklyInstagramScheduleDay,
  WeeklyInstagramScheduleInput,
} from '@/lib/chat/weekly-instagram-schedule'

/** Fixed event length for each posting slot. */
export const WEEKLY_INSTAGRAM_SCHEDULE_ICS_DURATION_MINUTES = 30

/** Fallback clock when a slot time cannot be parsed. */
export const WEEKLY_INSTAGRAM_SCHEDULE_ICS_FALLBACK_TIME = { hour: 10, minute: 0 } as const

export type ClockTime = { hour: number; minute: number }

export type WeeklyInstagramScheduleIcsRecurrence = 'once' | 'weekly'

export type BuildWeeklyInstagramScheduleIcsOptions = {
  schedule: WeeklyInstagramScheduleInput
  /** Any day in the target week; snapped to that week's Monday (ISO). */
  weekOfIso: string
  timeZone: string
  recurrence?: WeeklyInstagramScheduleIcsRecurrence
  /** Format labels for SUMMARY (e.g. Story, Post). Defaults to capitalized format id. */
  formatLabels?: Partial<Record<WeeklyInstagramScheduleDay['format'], string>>
}

const ISO_DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/

const WEEKDAY_OFFSET: Record<WeeklyInstagramScheduleDay['day'], number> = {
  monday: 0,
  tuesday: 1,
  wednesday: 2,
  thursday: 3,
  friday: 4,
  saturday: 5,
  sunday: 6,
}

/**
 * Parse a local calendar date from `YYYY-MM-DD` (no timezone shift).
 */
export function parseIsoDateOnlyLocal(value: string): Date | undefined {
  const trimmed = value.trim()
  if (!trimmed || !ISO_DATE_ONLY.test(trimmed)) {
    return undefined
  }

  const [ys, ms, ds] = trimmed.split('-')
  const year = Number(ys)
  const month = Number(ms)
  const day = Number(ds)
  if (
    !Number.isFinite(year) ||
    !Number.isFinite(month) ||
    !Number.isFinite(day) ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31
  ) {
    return undefined
  }

  const date = new Date(year, month - 1, day)
  if (
    Number.isNaN(date.getTime()) ||
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return undefined
  }

  return date
}

/** Format a local Date as `YYYY-MM-DD`. */
export function formatIsoDateOnlyLocal(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** Monday (local) of the ISO week that contains `date`. */
export function mondayOfWeekContaining(date: Date): Date {
  const result = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const day = result.getDay() // 0 Sun … 6 Sat
  const daysFromMonday = day === 0 ? 6 : day - 1
  result.setDate(result.getDate() - daysFromMonday)
  return result
}

/** Monday of the current local week as `YYYY-MM-DD`. */
export function defaultWeekOfIso(now = new Date()): string {
  return formatIsoDateOnlyLocal(mondayOfWeekContaining(now))
}

/**
 * Snap any ISO date in a week to that week's Monday.
 */
export function snapToWeekMondayIso(weekOfIso: string): string | null {
  const date = parseIsoDateOnlyLocal(weekOfIso)
  if (!date) return null
  return formatIsoDateOnlyLocal(mondayOfWeekContaining(date))
}

/**
 * Parse flexible clock strings from the schedule into 24h hour/minute.
 * Returns null for empty / placeholder times (`—`).
 */
export function parseScheduleClockTime(raw: string): ClockTime | null {
  const trimmed = raw.trim()
  if (!trimmed || trimmed === '—' || trimmed === '-' || trimmed === '–') {
    return null
  }

  const match = /^(\d{1,2})(?::(\d{2}))?\s*(?:([AaPp])\.?[Mm]\.?)?$/.exec(trimmed)
  if (!match) return null

  let hour = Number(match[1])
  const minute = match[2] != null ? Number(match[2]) : 0
  const meridiem = match[3]?.toLowerCase()

  if (!Number.isInteger(hour) || !Number.isInteger(minute) || minute < 0 || minute > 59) {
    return null
  }

  if (meridiem === 'a' || meridiem === 'p') {
    if (hour < 1 || hour > 12) return null
    if (meridiem === 'a') {
      hour = hour === 12 ? 0 : hour
    } else {
      hour = hour === 12 ? 12 : hour + 12
    }
  } else if (hour > 23) {
    return null
  }

  return { hour, minute }
}

export function resolveSlotClockTime(raw: string): ClockTime {
  return parseScheduleClockTime(raw) ?? { ...WEEKLY_INSTAGRAM_SCHEDULE_ICS_FALLBACK_TIME }
}

/**
 * Absolute ISO date for a weekday within a week identified by its Monday.
 */
export function isoDateForWeekday(
  weekMondayIso: string,
  weekday: WeeklyInstagramScheduleDay['day'],
): string | null {
  const monday = parseIsoDateOnlyLocal(weekMondayIso)
  if (!monday) return null
  const offset = WEEKDAY_OFFSET[weekday]
  const date = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + offset)
  return formatIsoDateOnlyLocal(date)
}

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

/** ICS local datetime without separators: `YYYYMMDDTHHMMSS`. */
export function formatIcsLocalDateTime(isoDate: string, clock: ClockTime): string {
  const [y, m, d] = isoDate.split('-')
  return `${y}${m}${d}T${pad2(clock.hour)}${pad2(clock.minute)}00`
}

export function addMinutesToClock(
  clock: ClockTime,
  minutes: number,
): {
  isoDateOffset: number
  clock: ClockTime
} {
  const total = clock.hour * 60 + clock.minute + minutes
  const dayOffset = Math.floor(total / (24 * 60))
  const withinDay = ((total % (24 * 60)) + 24 * 60) % (24 * 60)
  return {
    isoDateOffset: dayOffset,
    clock: { hour: Math.floor(withinDay / 60), minute: withinDay % 60 },
  }
}

function shiftIsoDate(isoDate: string, dayOffset: number): string {
  const date = parseIsoDateOnlyLocal(isoDate)
  if (!date) return isoDate
  date.setDate(date.getDate() + dayOffset)
  return formatIsoDateOnlyLocal(date)
}

/** Escape text values for ICS (RFC 5545). */
export function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r\n|\r|\n/g, '\\n')
}

/** Fold long content lines at 75 octets (approx chars for ASCII). */
export function foldIcsLine(line: string): string {
  if (line.length <= 75) return line
  const parts: string[] = []
  let remaining = line
  parts.push(remaining.slice(0, 75))
  remaining = remaining.slice(75)
  while (remaining.length > 0) {
    parts.push(` ${remaining.slice(0, 74)}`)
    remaining = remaining.slice(74)
  }
  return parts.join('\r\n')
}

function icsLine(key: string, value: string): string {
  return foldIcsLine(`${key}:${value}`)
}

function simpleHash(input: string): string {
  let h = 2166136261
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return (h >>> 0).toString(16).padStart(8, '0')
}

function formatLabel(
  format: WeeklyInstagramScheduleDay['format'],
  labels?: BuildWeeklyInstagramScheduleIcsOptions['formatLabels'],
): string {
  const fromMap = labels?.[format]
  if (fromMap) return fromMap
  return format.charAt(0).toUpperCase() + format.slice(1)
}

function trimSummaryPart(value: string, max = 80): string {
  const cleaned = value.trim()
  if (cleaned.length <= max) return cleaned
  return `${cleaned.slice(0, max - 1).trimEnd()}…`
}

function buildDescription(day: WeeklyInstagramScheduleDay): string {
  const parts: string[] = []
  if (day.caption_angle && day.caption_angle !== '—') {
    parts.push(`Caption: ${day.caption_angle}`)
  }
  if (day.why && day.why !== '—') {
    parts.push(`Why: ${day.why}`)
  }
  return parts.join('\n') || day.menu_items
}

/**
 * Build a Google Calendar–compatible iCalendar document for a weekly IG plan.
 * Returns null when the week date is invalid or there are no days.
 */
export function buildWeeklyInstagramScheduleIcs(
  options: BuildWeeklyInstagramScheduleIcsOptions,
): string | null {
  const weekMondayIso = snapToWeekMondayIso(options.weekOfIso)
  if (!weekMondayIso) return null

  const { schedule, timeZone, recurrence = 'once', formatLabels } = options
  if (schedule.days.length === 0) return null

  const stamp = formatIcsUtcStamp(new Date())
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Menuyukti//IG Plan//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ]

  schedule.days.forEach((day, index) => {
    const isoDate = isoDateForWeekday(weekMondayIso, day.day)
    if (!isoDate) return

    const startClock = resolveSlotClockTime(day.time)
    const endShift = addMinutesToClock(startClock, WEEKLY_INSTAGRAM_SCHEDULE_ICS_DURATION_MINUTES)
    const endIso = shiftIsoDate(isoDate, endShift.isoDateOffset)

    const summary = `${formatLabel(day.format, formatLabels)}: ${trimSummaryPart(day.menu_items)}`
    const uidSeed = [
      schedule.title,
      weekMondayIso,
      day.day,
      day.time,
      day.format,
      day.menu_items,
      String(index),
    ].join('|')
    const uid = `ig-plan-${simpleHash(uidSeed)}-${index}@menuyukti`

    const tzid = timeZone.trim() || 'UTC'
    lines.push('BEGIN:VEVENT')
    lines.push(icsLine('UID', uid))
    lines.push(icsLine('DTSTAMP', stamp))
    lines.push(foldIcsLine(`DTSTART;TZID=${tzid}:${formatIcsLocalDateTime(isoDate, startClock)}`))
    lines.push(foldIcsLine(`DTEND;TZID=${tzid}:${formatIcsLocalDateTime(endIso, endShift.clock)}`))
    lines.push(icsLine('SUMMARY', escapeIcsText(summary)))
    const description = buildDescription(day)
    if (description) {
      lines.push(icsLine('DESCRIPTION', escapeIcsText(description)))
    }
    if (recurrence === 'weekly') {
      lines.push('RRULE:FREQ=WEEKLY')
    }
    lines.push('END:VEVENT')
  })

  lines.push('END:VCALENDAR')
  return lines.join('\r\n')
}

function formatIcsUtcStamp(date: Date): string {
  const y = date.getUTCFullYear()
  const m = pad2(date.getUTCMonth() + 1)
  const d = pad2(date.getUTCDate())
  const hh = pad2(date.getUTCHours())
  const mm = pad2(date.getUTCMinutes())
  const ss = pad2(date.getUTCSeconds())
  return `${y}${m}${d}T${hh}${mm}${ss}Z`
}

export function suggestedIcsFilename(scheduleTitle: string): string {
  const slug = scheduleTitle
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
  return `${slug || 'instagram-plan'}.ics`
}

/**
 * Trigger a browser download of the given ICS text.
 */
export function downloadWeeklyInstagramScheduleIcs(icsText: string, filename: string): void {
  if (typeof document === 'undefined') return
  const blob = new Blob([icsText], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename.endsWith('.ics') ? filename : `${filename}.ics`
  anchor.rel = 'noopener'
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(url)
}

export function getBrowserTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  } catch {
    return 'UTC'
  }
}
