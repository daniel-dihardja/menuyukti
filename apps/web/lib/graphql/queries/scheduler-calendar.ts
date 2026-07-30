import type { SchedulerSlot } from '@/lib/calendar/scheduler-calendar'
import type { CalendarMediaRef } from './calendar-entries'

export type { CalendarMediaRef }

/** Slot shown on the workspace calendar (manual entries). */
export type CalendarDisplaySlot = {
  kind?: SchedulerSlot['kind'] | null
  date: string
  time: string
  title: string
  id?: string | null
  description?: string | null
  mediaRefs?: CalendarMediaRef[] | null
  source?: 'manual' | null
}

export const SCHEDULER_CALENDAR_QUERY = `
  query SchedulerCalendar($locationId: Int!) {
    schedulerCalendar(locationId: $locationId) {
      windowStart
      windowEnd
      publicHolidays {
        name
        description
        date
      }
      slots {
        id
        kind
        date
        time
        title
        description
        source
        mediaRefs {
          kind
          name
        }
      }
    }
  }
`

export type SchedulerCalendarPayload = {
  windowStart: string | null
  windowEnd: string | null
  publicHolidays: Array<{
    name: string
    description: string
    date: string
  }>
  slots: CalendarDisplaySlot[]
}

export type SchedulerCalendarData = {
  schedulerCalendar: SchedulerCalendarPayload
}
