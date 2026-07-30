import { z } from 'zod'

/** Public holiday overlay for the location calendar. */
export const calendarPublicHolidaySchema = z.object({
  name: z.string(),
  description: z.string(),
  date: z.string(),
})

export type CalendarPublicHoliday = z.infer<typeof calendarPublicHolidaySchema>
