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

export const critiqueConfigSchema = z.object({
  prompt: z.string().trim().min(1).max(2000),
  maxIterations: z.number().int().min(1).max(3),
  minScore: z.number().int().min(1).max(10),
})

export type CritiqueConfig = z.infer<typeof critiqueConfigSchema>

export const critiqueVerdictSchema = z.object({
  score: z.number().int().min(1).max(10),
  feedback: z.string().min(1).max(1000),
  passed: z.boolean(),
})

export const critiqueRoundSchema = z.object({
  draft: storyDraftResultSchema,
  verdict: critiqueVerdictSchema,
})

export const critiqueSummarySchema = z.object({
  rounds: z.array(critiqueRoundSchema).min(1),
  finalScore: z.number().int().min(1).max(10),
  passed: z.boolean(),
})

export type CritiqueSummary = z.infer<typeof critiqueSummarySchema>

export const holidayStoryDraftBodySchema = z
  .object({
    locationId: z.number().int().positive(),
    holiday: holidayStoryDraftHolidaySchema,
    instructions: z.string().trim().max(2000).optional(),
    previousResult: storyDraftResultSchema.optional(),
    feedback: z.string().trim().min(1).max(1000).optional(),
    critique: critiqueConfigSchema.optional(),
  })
  .refine(
    (body) => {
      const hasPrev = body.previousResult !== undefined
      const hasFeedback = body.feedback !== undefined
      return hasPrev === hasFeedback
    },
    {
      message: 'previousResult and feedback must both be provided for a revision, or both omitted',
    },
  )
  .refine(
    (body) => {
      if (body.critique === undefined) return true
      return body.previousResult === undefined && body.feedback === undefined
    },
    {
      message: 'critique cannot be combined with previousResult/feedback',
    },
  )

export type HolidayStoryDraftBody = z.infer<typeof holidayStoryDraftBodySchema>

export const holidayStoryDraftResponseSchema = z.object({
  id: z.string(),
  date: z.string(),
  name: z.string(),
  result: storyDraftResultSchema,
  critique: critiqueSummarySchema.optional(),
})

export type HolidayStoryDraftResponse = z.infer<typeof holidayStoryDraftResponseSchema>
