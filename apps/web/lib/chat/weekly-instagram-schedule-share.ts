import type {
  WeeklyInstagramScheduleDay,
  WeeklyInstagramScheduleInput,
} from '@/lib/chat/weekly-instagram-schedule'

export type WeeklyInstagramScheduleShareLabels = {
  weekdays: Record<WeeklyInstagramScheduleDay['day'], string>
  formats: Record<WeeklyInstagramScheduleDay['format'], string>
  captionLabel: string
  whyLabel: string
}

function isPresentField(value: string): boolean {
  const trimmed = value.trim()
  return Boolean(trimmed) && trimmed !== '—' && trimmed !== '-' && trimmed !== '–'
}

function formatSlotLines(
  day: WeeklyInstagramScheduleDay,
  labels: WeeklyInstagramScheduleShareLabels,
): string[] {
  const weekday = labels.weekdays[day.day]
  const format = labels.formats[day.format]
  const time = day.time.trim() || '—'
  const menus = day.menu_items.trim() || '—'
  const lines = [`${weekday} · ${format} · ${time} — ${menus}`]

  if (isPresentField(day.caption_angle)) {
    lines.push(`  ${labels.captionLabel}: ${day.caption_angle.trim()}`)
  }
  if (isPresentField(day.why)) {
    lines.push(`  ${labels.whyLabel}: ${day.why.trim()}`)
  }
  return lines
}

/**
 * Format a weekly Instagram schedule as messenger-friendly plain text.
 */
export function formatWeeklyInstagramScheduleShareText(
  schedule: WeeklyInstagramScheduleInput,
  labels: WeeklyInstagramScheduleShareLabels,
): string {
  const title = schedule.title.trim()
  const summary = schedule.summary.trim()
  const header: string[] = []
  if (title) header.push(title)
  // Skip placeholder or duplicate summary (agents sometimes repeat the title).
  if (
    isPresentField(summary) &&
    summary.localeCompare(title, undefined, { sensitivity: 'accent' }) !== 0
  ) {
    header.push(summary)
  }
  const body = schedule.days.flatMap((day) => formatSlotLines(day, labels))
  return [...header, '', ...body].join('\n').trimEnd() + '\n'
}

export type ShareOrCopyResult = 'shared' | 'copied'

export class ShareCancelledError extends Error {
  constructor() {
    super('Share cancelled')
    this.name = 'ShareCancelledError'
  }
}

function isAbortError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const name = 'name' in error ? String(error.name) : ''
  return name === 'AbortError'
}

/**
 * Prefer Web Share when available; otherwise copy `text` to the clipboard.
 * Throws {@link ShareCancelledError} when the user dismisses the share sheet.
 *
 * Passes only `text` to the share sheet — many messengers prepend a separate
 * `title`, which would duplicate the plan title already in the formatted body.
 */
export async function shareOrCopyText(text: string): Promise<ShareOrCopyResult> {
  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      await navigator.share({ text })
      return 'shared'
    } catch (error) {
      if (isAbortError(error)) {
        throw new ShareCancelledError()
      }
      // Fall through to clipboard when share fails for other reasons
      // (e.g. permission / unsupported payload).
    }
  }

  if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) {
    throw new Error('Clipboard unavailable')
  }

  await navigator.clipboard.writeText(text)
  return 'copied'
}
