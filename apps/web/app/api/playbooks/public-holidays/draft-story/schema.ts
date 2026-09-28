import { z } from 'zod'

export const holidayStoryDraftHolidaySchema = z.object({
  id: z.string().trim().min(1).max(256),
  date: z.string().trim().min(1).max(32),
  name: z.string().trim().min(1).max(512),
  localName: z.string().trim().max(512).optional(),
})

export const storyDraftResultSchema = z.object({
  caption: z.string().min(1).max(500),
  visualBrief: z.string().min(1).max(1000),
})

export type StoryDraftResult = z.infer<typeof storyDraftResultSchema>

export const holidayStoryDraftBodySchema = z
  .object({
    locationId: z.number().int().positive(),
    holiday: holidayStoryDraftHolidaySchema,
    instructions: z.string().trim().max(2000).optional(),
    previousResult: storyDraftResultSchema.optional(),
    feedback: z.string().trim().min(1).max(1000).optional(),
  })
  .refine(
    (body) => {
      const hasPrev = body.previousResult !== undefined
      const hasFeedback = body.feedback !== undefined
      return hasPrev === hasFeedback
    },
    {
      message:
        'previousResult and feedback must both be provided for a revision, or both omitted',
    },
  )

export type HolidayStoryDraftBody = z.infer<typeof holidayStoryDraftBodySchema>

export const holidayStoryDraftResponseSchema = z.object({
  id: z.string(),
  date: z.string(),
  name: z.string(),
  result: storyDraftResultSchema,
})

export type HolidayStoryDraftResponse = z.infer<typeof holidayStoryDraftResponseSchema>
