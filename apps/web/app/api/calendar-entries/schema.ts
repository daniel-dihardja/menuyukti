import { z } from 'zod'

export const calendarMediaRefSchema = z.object({
  kind: z.literal('photo'),
  name: z.string().trim().min(1).max(512),
})

export const calendarSourceRefSchema = z.object({
  type: z.literal('instagram_item'),
  workflowId: z.string().trim().min(1).max(128),
  itemId: z.string().trim().min(1).max(128),
})

export const createCalendarEntryBodySchema = z.object({
  locationId: z.number().int().positive(),
  title: z.string().trim().min(1).max(256),
  description: z.string().max(4000).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  mediaRefs: z.array(calendarMediaRefSchema).max(12).optional(),
  sourceRef: calendarSourceRefSchema.optional(),
})

export const updateCalendarEntryBodySchema = z.object({
  title: z.string().trim().min(1).max(256).optional(),
  description: z.string().max(4000).optional(),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  time: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .optional(),
  mediaRefs: z.array(calendarMediaRefSchema).max(12).optional(),
  sourceRef: calendarSourceRefSchema.optional(),
})

export type CreateCalendarEntryBody = z.infer<typeof createCalendarEntryBodySchema>
export type UpdateCalendarEntryBody = z.infer<typeof updateCalendarEntryBodySchema>
export type CalendarSourceRefBody = z.infer<typeof calendarSourceRefSchema>
