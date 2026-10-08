import { z } from 'zod'

import { LEONARDO_PROMPT_MAX_CHARS } from '@/lib/playbooks/client-api'

export { LEONARDO_PROMPT_MAX_CHARS }

export const generateArtworkBodySchema = z
  .object({
    prompt: z.string().trim().min(1).max(LEONARDO_PROMPT_MAX_CHARS),
    styleImageName: z.string().trim().min(1).max(512),
    previousImageName: z.string().trim().min(1).max(512).optional(),
    feedback: z.string().trim().min(1).max(1000).optional(),
  })
  .refine(
    (body) => {
      const hasPrev = body.previousImageName !== undefined
      const hasFeedback = body.feedback !== undefined
      return hasPrev === hasFeedback
    },
    {
      message:
        'previousImageName and feedback must both be provided for a revision, or both omitted',
    },
  )

export type GenerateArtworkBody = z.infer<typeof generateArtworkBodySchema>

export const generateArtworkResponseSchema = z.object({
  url: z.string().min(1),
  name: z.string().min(1),
  mediaS3Key: z.string().min(1),
  size: z.number().int().nonnegative(),
  createdAt: z.string().min(1),
})

export type GenerateArtworkResponse = z.infer<typeof generateArtworkResponseSchema>
