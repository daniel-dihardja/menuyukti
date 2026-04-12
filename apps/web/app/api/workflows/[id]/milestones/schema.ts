import { z } from 'zod'

import { milestoneRunSkillModeSchema, passCriteriaDataSchema } from '@/lib/graphql/node-schemas'

export const workflowIdParamSchema = z.string().regex(/^\d+$/, 'Invalid workflow id')

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
    /** Stored on milestone node `data` JSON. */
    dataTask: z.enum(['manual']).optional(),
    /** Stored on milestone node `data` JSON; agents skip LLM skill pick when `fixed` + valid ids. */
    milestoneRunSkillMode: milestoneRunSkillModeSchema.optional(),
    milestoneRunSkillIds: z.array(z.string().trim().min(1)).max(2).optional(),
    passCriteria: z.array(passCriteriaRowSchema).optional(),
    move: z.enum(['up', 'down']).optional(),
  })
  .refine(
    (v) =>
      v.name !== undefined ||
      v.goal !== undefined ||
      v.milestoneData !== undefined ||
      v.dataTask !== undefined ||
      v.milestoneRunSkillMode !== undefined ||
      v.milestoneRunSkillIds !== undefined ||
      v.passCriteria !== undefined ||
      v.move !== undefined,
    {
      message:
        'Provide at least one of name, goal, milestoneData, dataTask, milestoneRunSkillMode, milestoneRunSkillIds, passCriteria, or move',
    },
  )
