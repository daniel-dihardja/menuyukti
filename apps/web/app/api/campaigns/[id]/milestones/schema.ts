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
    /** Free-form text; not trimmed so spaces inside and at edges are preserved. */
    goal: z.string().optional(),
    /** Milestone Data tab; persisted on a child `milestonedata` node as `{ data: string }`. */
    milestoneData: z.string().optional(),
    /** Stored on milestone node `data` JSON (`manual` | `location_profile`). */
    dataTask: z.enum(['manual', 'location_profile']).optional(),
    passCriteria: z.array(passCriteriaRowSchema).optional(),
    move: z.enum(['up', 'down']).optional(),
  })
  .refine(
    (v) =>
      v.name !== undefined ||
      v.goal !== undefined ||
      v.milestoneData !== undefined ||
      v.dataTask !== undefined ||
      v.passCriteria !== undefined ||
      v.move !== undefined,
    {
      message:
        'Provide at least one of name, goal, milestoneData, dataTask, passCriteria, or move',
    },
  )
