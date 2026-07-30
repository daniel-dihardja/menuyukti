import type { SchedulerSlot } from '@/lib/calendar/scheduler-calendar'
import type { CalendarMediaRef, CalendarSourceRef } from './calendar-entries'

export type { CalendarMediaRef, CalendarSourceRef }

/** Slot shown on the workspace / scheduler calendar (workflow or manual). */
export type CalendarDisplaySlot = {
  kind?: SchedulerSlot['kind'] | null
  date: string
  time: string
  title: string
  id?: string | null
  description?: string | null
  mediaRefs?: CalendarMediaRef[] | null
  source?: 'manual' | 'workflow' | null
  sourceRef?: CalendarSourceRef | null
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
        sourceRef {
          type
          workflowId
          itemId
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
