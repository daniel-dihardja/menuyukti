import { z } from 'zod'

export const campaignIdParamSchema = z.string().regex(/^\d+$/, 'Invalid campaign id')

export const milestoneIdParamSchema = z.string().regex(/^\d+$/, 'Invalid milestone id')

export const createMilestoneBodySchema = z.object({
  name: z.string().trim().min(1).max(500).optional(),
})

export const passCriteriaRowSchema = z.object({
  id: z.string().regex(/^\d+$/).optional(),
  requirement: z.string(),
  status: z.enum(['pass', 'fail', 'open']),
})

export const patchMilestoneSchema = z
  .object({
    name: z.string().trim().min(1).max(500).optional(),
    passCriteria: z.array(passCriteriaRowSchema).optional(),
  })
  .refine((v) => v.name !== undefined || v.passCriteria !== undefined, {
    message: 'Provide at least one of name or passCriteria',
  })
