import { z } from 'zod'

export const WEEKLY_INSTAGRAM_SCHEDULE_WEEKDAYS = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const

export const WEEKLY_INSTAGRAM_SCHEDULE_FORMATS = ['story', 'post', 'carousel', 'reel'] as const

const WEEKDAY_ALIASES: Record<string, (typeof WEEKLY_INSTAGRAM_SCHEDULE_WEEKDAYS)[number]> = {
  mon: 'monday',
  monday: 'monday',
  montag: 'monday',
  tue: 'tuesday',
  tues: 'tuesday',
  tuesday: 'tuesday',
  dienstag: 'tuesday',
  wed: 'wednesday',
  weds: 'wednesday',
  wednesday: 'wednesday',
  mittwoch: 'wednesday',
  thu: 'thursday',
  thur: 'thursday',
  thurs: 'thursday',
  thursday: 'thursday',
  donnerstag: 'thursday',
  fri: 'friday',
  friday: 'friday',
  freitag: 'friday',
  sat: 'saturday',
  saturday: 'saturday',
  samstag: 'saturday',
  sun: 'sunday',
  sunday: 'sunday',
  sonntag: 'sunday',
}

const FORMAT_ALIASES: Record<string, (typeof WEEKLY_INSTAGRAM_SCHEDULE_FORMATS)[number]> = {
  story: 'story',
  stories: 'story',
  igstory: 'story',
  instagramstory: 'story',
  post: 'post',
  feed: 'post',
  feedpost: 'post',
  igpost: 'post',
  instagrampost: 'post',
  carousel: 'carousel',
  carousels: 'carousel',
  album: 'carousel',
  reel: 'reel',
  reels: 'reel',
  igreel: 'reel',
  video: 'reel',
}

function normalizeWeekday(
  raw: unknown,
): (typeof WEEKLY_INSTAGRAM_SCHEDULE_WEEKDAYS)[number] | null {
  if (typeof raw !== 'string') return null
  const key = raw
    .trim()
    .toLowerCase()
    .replace(/\.$/, '')
    .replace(/[^a-z]/g, '')
  return WEEKDAY_ALIASES[key] ?? null
}

function normalizeFormat(raw: unknown): (typeof WEEKLY_INSTAGRAM_SCHEDULE_FORMATS)[number] | null {
  if (typeof raw !== 'string') return null
  const key = raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z]/g, '')
  return FORMAT_ALIASES[key] ?? null
}

function normalizeMenuItems(raw: unknown): string {
  if (typeof raw === 'string') return raw.trim()
  if (Array.isArray(raw)) {
    return raw
      .map((item) => (typeof item === 'string' ? item.trim() : ''))
      .filter(Boolean)
      .join(', ')
  }
  if (raw != null && typeof raw !== 'object') return String(raw).trim()
  return ''
}

function normalizeText(raw: unknown): string {
  if (typeof raw === 'string') return raw.trim()
  if (raw == null) return ''
  if (typeof raw === 'number' || typeof raw === 'boolean') return String(raw)
  return ''
}

/** Leading clock time + separator, e.g. `8:00 AM — caption` or `11:30 - caption`. */
const LEADING_TIME_IN_CAPTION_RE = /^(\d{1,2}(?::\d{2})?\s*(?:[AaPp][Mm])?)\s*[—–\-:]\s*(.+)$/s

/**
 * If caption starts with a clock time, move it into `time` and return the cleaned caption.
 */
export function splitLeadingTimeFromCaption(
  time: string,
  caption: string,
): { time: string; caption: string } {
  const match = LEADING_TIME_IN_CAPTION_RE.exec(caption.trim())
  if (!match) {
    return { time: time.trim(), caption: caption.trim() }
  }
  const extractedTime = match[1]?.trim() ?? ''
  const rest = match[2]?.trim() ?? ''
  const hasRealTime = Boolean(time.trim() && time.trim() !== '—')
  return {
    time: hasRealTime ? time.trim() : extractedTime,
    caption: rest || '—',
  }
}

function parseMaybeJson(raw: unknown): unknown {
  if (typeof raw !== 'string') return raw
  const trimmed = raw.trim()
  if (!trimmed) return raw
  try {
    return JSON.parse(trimmed) as unknown
  } catch {
    return raw
  }
}

function normalizeDayRecord(raw: unknown): WeeklyInstagramScheduleDay | null {
  const parsed = parseMaybeJson(raw)
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null
  const row = parsed as Record<string, unknown>
  const day = normalizeWeekday(row.day ?? row.weekday ?? row.dayOfWeek ?? row.day_of_week)
  const format =
    normalizeFormat(row.format ?? row.post_format ?? row.postFormat ?? row.type) ?? 'post'
  const menu_items = normalizeMenuItems(
    row.menu_items ?? row.menuItems ?? row.menus ?? row.menu ?? row.dishes,
  )
  const rawTime = normalizeText(
    row.time ?? row.posting_time ?? row.postingTime ?? row.slot_time ?? row.slotTime ?? row.hour,
  )
  const rawCaption = normalizeText(
    row.caption_angle ?? row.captionAngle ?? row.caption ?? row.angle,
  )
  const { time, caption } = splitLeadingTimeFromCaption(rawTime, rawCaption)
  const why = normalizeText(row.why ?? row.rationale ?? row.reason ?? row.because)
  if (!day) return null
  return {
    day,
    time: time || '—',
    format,
    menu_items: menu_items || '—',
    caption_angle: caption || '—',
    why: why || '—',
  }
}

function coerceDaysList(raw: unknown): unknown[] {
  const parsed = parseMaybeJson(raw)
  if (Array.isArray(parsed)) return parsed
  if (parsed && typeof parsed === 'object') {
    // Sometimes models emit {"0": {...}, "1": {...}} instead of an array.
    const values = Object.values(parsed as Record<string, unknown>)
    if (values.length > 0 && values.every((v) => v && typeof v === 'object')) {
      return values
    }
  }
  return []
}

function coerceScheduleShape(input: unknown): unknown {
  const root = parseMaybeJson(input)
  if (!root || typeof root !== 'object' || Array.isArray(root)) return root
  const obj = root as Record<string, unknown>
  const days = coerceDaysList(obj.days ?? obj.schedule ?? obj.slots ?? obj.plan)
    .map(normalizeDayRecord)
    .filter((day): day is WeeklyInstagramScheduleDay => day != null)
  return {
    title: normalizeText(obj.title ?? obj.name) || 'Weekly Instagram plan',
    summary: normalizeText(obj.summary ?? obj.description ?? obj.intro) || '—',
    days,
  }
}

export const weeklyInstagramScheduleDaySchema = z.object({
  day: z.enum(WEEKLY_INSTAGRAM_SCHEDULE_WEEKDAYS),
  time: z.string().min(1),
  format: z.enum(WEEKLY_INSTAGRAM_SCHEDULE_FORMATS),
  menu_items: z.string().min(1),
  caption_angle: z.string().min(1),
  why: z.string().min(1),
})

export const weeklyInstagramScheduleInputSchema = z.object({
  title: z.string().min(1),
  summary: z.string().min(1),
  days: z.array(weeklyInstagramScheduleDaySchema).min(1),
})

export type WeeklyInstagramScheduleDay = z.infer<typeof weeklyInstagramScheduleDaySchema>
export type WeeklyInstagramScheduleInput = z.infer<typeof weeklyInstagramScheduleInputSchema>

/**
 * Parse tool input (or echoed tool output) for `present_weekly_instagram_schedule`.
 * Returns null when the payload is missing or invalid.
 */
export function parseWeeklyInstagramScheduleInput(
  input: unknown,
): WeeklyInstagramScheduleInput | null {
  const result = weeklyInstagramScheduleInputSchema.safeParse(coerceScheduleShape(input))
  return result.success ? result.data : null
}

/**
 * Prefer tool-call args; fall back to tool output JSON that echoes the schedule.
 */
export function parseWeeklyInstagramScheduleFromToolPart(part: {
  input?: unknown
  output?: unknown
}): WeeklyInstagramScheduleInput | null {
  return (
    parseWeeklyInstagramScheduleInput(part.input) ?? parseWeeklyInstagramScheduleInput(part.output)
  )
}
