import { z } from 'zod'

export const campaignIdParamSchema = z.string().regex(/^\d+$/, 'Invalid campaign id')

export const createMilestoneBodySchema = z.object({
  name: z.string().trim().min(1).max(500).optional(),
})
