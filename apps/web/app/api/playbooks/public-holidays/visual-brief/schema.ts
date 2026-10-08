import { z } from 'zod'

import { LEONARDO_PROMPT_MAX_CHARS } from '@/lib/playbooks/client-api'

import { holidayStoryDraftHolidaySchema, storyDraftResultSchema } from '../draft-story/schema'
import { styleAnalysisResultSchema } from '../analyze-style/schema'

export const visualBriefResultSchema = z.object({
  scene: z.string().min(1).max(1000),
  mood: z.string().min(1).max(500),
  composition: z.string().min(1).max(1000),
  leonardoPrompt: z.string().min(1).max(LEONARDO_PROMPT_MAX_CHARS),
})

export type VisualBriefResult = z.infer<typeof visualBriefResultSchema>

export const visualBriefBodySchema = z
  .object({
    locationId: z.number().int().positive(),
    holiday: holidayStoryDraftHolidaySchema,
    storyDraft: storyDraftResultSchema,
    styleAnalysis: styleAnalysisResultSchema,
    instructions: z.string().trim().max(2000).optional(),
    previousResult: visualBriefResultSchema.optional(),
    feedback: z.string().trim().min(1).max(1000).optional(),
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

export type VisualBriefBody = z.infer<typeof visualBriefBodySchema>

export const visualBriefResponseSchema = z.object({
  id: z.string(),
  date: z.string(),
  name: z.string(),
  result: visualBriefResultSchema,
})

export type VisualBriefResponse = z.infer<typeof visualBriefResponseSchema>
