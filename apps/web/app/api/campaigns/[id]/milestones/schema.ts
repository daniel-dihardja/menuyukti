import { z } from 'zod'

export const campaignIdParamSchema = z.string().regex(/^\d+$/, 'Invalid campaign id')

export const milestoneIdParamSchema = z.string().regex(/^\d+$/, 'Invalid milestone id')

export const createMilestoneBodySchema = z.object({
  name: z.string().trim().min(1).max(500).optional(),
})

export const patchMilestoneNameSchema = z.object({
  name: z.string().trim().min(1).max(500),
})
