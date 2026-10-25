import {
  buildWeeklyInstagramScheduleIcs,
  downloadWeeklyInstagramScheduleIcs,
  suggestedIcsFilename,
} from '@/lib/chat/weekly-instagram-schedule-ics'
import {
  parseWeeklyInstagramScheduleInput,
  type WeeklyInstagramScheduleInput,
} from '@/lib/chat/weekly-instagram-schedule'
import {
  formatWeeklyInstagramScheduleShareText,
  ShareCancelledError,
  shareOrCopyText,
} from '@/lib/chat/weekly-instagram-schedule-share'

export type ChatKitScheduleWidgetAction =
  | { type: 'schedule.export_ics'; schedule: WeeklyInstagramScheduleInput }
  | { type: 'schedule.share'; schedule: WeeklyInstagramScheduleInput }
  | { type: 'ignored' }

/** Classify a ChatKit widget action payload for weekly schedule buttons. */
export function classifyChatKitScheduleWidgetAction(action: {
  type: string
  payload?: Record<string, unknown>
}): ChatKitScheduleWidgetAction {
  if (action.type !== 'schedule.export_ics' && action.type !== 'schedule.share') {
    return { type: 'ignored' }
  }
  const raw = action.payload?.schedule
  const schedule = parseWeeklyInstagramScheduleInput(raw)
  if (!schedule) return { type: 'ignored' }
  return { type: action.type, schedule }
}

function currentWeekMondayIso(now = new Date()): string {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const day = d.getDay() // 0 Sun … 6 Sat
  const offset = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + offset)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

export type ScheduleWidgetActionLabels = {
  weekdays: Record<WeeklyInstagramScheduleInput['days'][number]['day'], string>
  formats: Record<WeeklyInstagramScheduleInput['days'][number]['format'], string>
  captionLabel: string
  whyLabel: string
}

export type ScheduleWidgetActionResult =
  | { ok: true; kind: 'exported' | 'shared' | 'copied' }
  | { ok: false; kind: 'cancelled' | 'error' | 'ignored' }

/** Run Export ICS / Share for a ChatKit schedule widget action. */
export async function runChatKitScheduleWidgetAction(
  action: { type: string; payload?: Record<string, unknown> },
  labels: ScheduleWidgetActionLabels,
): Promise<ScheduleWidgetActionResult> {
  const classified = classifyChatKitScheduleWidgetAction(action)
  if (classified.type === 'ignored') return { ok: false, kind: 'ignored' }

  if (classified.type === 'schedule.export_ics') {
    const ics = buildWeeklyInstagramScheduleIcs({
      schedule: classified.schedule,
      weekOfIso: currentWeekMondayIso(),
      timeZone:
        typeof Intl !== 'undefined'
          ? Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
          : 'UTC',
      recurrence: 'once',
      formatLabels: labels.formats,
    })
    if (!ics) return { ok: false, kind: 'error' }
    downloadWeeklyInstagramScheduleIcs(ics, suggestedIcsFilename(classified.schedule.title))
    return { ok: true, kind: 'exported' }
  }

  try {
    const text = formatWeeklyInstagramScheduleShareText(classified.schedule, {
      weekdays: labels.weekdays,
      formats: labels.formats,
      captionLabel: labels.captionLabel,
      whyLabel: labels.whyLabel,
    })
    const result = await shareOrCopyText(text)
    return { ok: true, kind: result === 'shared' ? 'shared' : 'copied' }
  } catch (error) {
    if (error instanceof ShareCancelledError) return { ok: false, kind: 'cancelled' }
    return { ok: false, kind: 'error' }
  }
}
