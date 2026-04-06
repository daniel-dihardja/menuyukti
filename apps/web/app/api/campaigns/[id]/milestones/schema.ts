import { z } from 'zod'

import { passCriteriaDataSchema } from '@/lib/graphql/node-schemas'

export const campaignIdParamSchema = z.string().regex(/^\d+$/, 'Invalid campaign id')

export const milestoneIdParamSchema = z.string().regex(/^\d+$/, 'Invalid milestone id')

export const createMilestoneBodySchema = z.object({
  name: z.string().trim().min(1).max(500).optional(),
})

export const passCriteriaRowSchema = passCriteriaDataSchema.extend({
  id: z.string().regex(/^\d+$/).optional(),
})

export const patchMilestoneSchema = z
  .object({
    name: z.string().trim().min(1).max(500).optional(),
    passCriteria: z.array(passCriteriaRowSchema).optional(),
  })
  .refine((v) => v.name !== undefined || v.passCriteria !== undefined, {
    message: 'Provide at least one of name or passCriteria',
  })
