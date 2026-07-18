import type { CampaignWindowPublicHoliday, SchedulerSlot } from '../node-schemas'

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
        kind
        date
        time
        title
      }
    }
  }
`

export type SchedulerCalendarPayload = {
  windowStart: string | null
  windowEnd: string | null
  publicHolidays: CampaignWindowPublicHoliday[]
  slots: Array<{
    kind?: SchedulerSlot['kind'] | null
    date: string
    time: string
    title: string
  }>
}

export type SchedulerCalendarData = {
  schedulerCalendar: SchedulerCalendarPayload
}
