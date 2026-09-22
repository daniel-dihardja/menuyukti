import { z } from 'zod'

export const holidayRelevanceItemSchema = z.object({
  id: z.string().trim().min(1).max(256),
  date: z.string().trim().min(1).max(32),
  name: z.string().trim().min(1).max(512),
  localName: z.string().trim().max(512).optional(),
})

export const holidayRelevanceBodySchema = z.object({
  locationId: z.number().int().positive(),
  holidays: z.array(holidayRelevanceItemSchema).max(200),
  instructions: z.string().trim().max(2000).optional(),
})

export type HolidayRelevanceBody = z.infer<typeof holidayRelevanceBodySchema>

export const holidayRelevanceResultSchema = z.object({
  id: z.string(),
  date: z.string(),
  name: z.string(),
  relevant: z.boolean(),
})

export type HolidayRelevanceResult = z.infer<typeof holidayRelevanceResultSchema>

export const holidayRelevanceResponseSchema = z.object({
  holidays: z.array(holidayRelevanceResultSchema),
})
