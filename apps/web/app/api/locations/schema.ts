import { z } from 'zod'

const WEEKDAYS = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const

export const dayOfWeekSchema = z.enum(WEEKDAYS)

/** One row in the weekly schedule UI (always 7 rows, one per weekday). */
export const openingHourDaySchema = z
  .object({
    dayOfWeek: dayOfWeekSchema,
    /** When true, the location is closed that day; times are ignored. */
    closed: z.boolean(),
    openTime: z.string(),
    closeTime: z.string(),
  })
  .superRefine((data, ctx) => {
    if (data.closed) {
      return
    }
    if (!data.openTime?.trim()) {
      ctx.addIssue({
        code: 'custom',
        message: 'Open time is required for open days',
        path: ['openTime'],
      })
    }
    if (!data.closeTime?.trim()) {
      ctx.addIssue({
        code: 'custom',
        message: 'Close time is required for open days',
        path: ['closeTime'],
      })
    }
    if (data.openTime?.trim() && data.closeTime?.trim() && data.openTime >= data.closeTime) {
      ctx.addIssue({
        code: 'custom',
        message: 'Close time must be after open time',
        path: ['closeTime'],
      })
    }
  })

export const openingHoursWeekSchema = z
  .array(openingHourDaySchema)
  .length(7)
  .superRefine((rows, ctx) => {
    const keys = rows.map((r) => r.dayOfWeek)
    if (new Set(keys).size !== keys.length) {
      ctx.addIssue({
        code: 'custom',
        message: 'Each weekday must appear exactly once',
        path: [],
      })
    }
  })

export type OpeningHourDayInput = z.infer<typeof openingHourDaySchema>
export type OpeningHoursWeekInput = z.infer<typeof openingHoursWeekSchema>

/** Payload shape for `UPDATE_LOCATION_MUTATION` openingHours variable. */
export type OpeningHourMutationInput = {
  dayOfWeek: string
  openTime: string
  closeTime: string
}

export function openingHoursWeekToMutationInput(
  rows: OpeningHoursWeekInput,
): OpeningHourMutationInput[] {
  return rows
    .filter((entry) => !entry.closed && entry.openTime.trim() && entry.closeTime.trim())
    .map((entry) => ({
      dayOfWeek: entry.dayOfWeek,
      openTime: entry.openTime.trim(),
      closeTime: entry.closeTime.trim(),
    }))
}

export const createLocationSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  street: z.string().optional().default(''),
  city: z.string().optional().default(''),
  country: z.string().optional().default(''),
  currency: z.string().optional().default(''),
  openingHours: openingHoursWeekSchema.optional(),
})

export type CreateLocationInput = z.infer<typeof createLocationSchema>

export const updateLocationSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  street: z.string().optional().default(''),
  city: z.string().optional().default(''),
  country: z.string().optional().default(''),
  currency: z.string().optional().default(''),
  openingHours: openingHoursWeekSchema,
})

export type UpdateLocationInput = z.infer<typeof updateLocationSchema>
