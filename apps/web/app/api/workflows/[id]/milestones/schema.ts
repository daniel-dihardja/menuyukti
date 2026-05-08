import { z } from 'zod'

import {
  campaignBriefMilestoneDataSchema,
  campaignBriefMilestoneInputValueSchema,
  cultureHooksMilestoneDataSchema,
  cultureHooksMilestoneInputValueSchema,
  milestonePresetIdSchema,
  milestoneInputSchema,
  passCriteriaSchema,
  postSchedulerMilestoneDataSchema,
  postSchedulerMilestoneInputValueSchema,
  promotionCandidatesMilestoneDataSchema,
} from '@/lib/graphql/node-schemas'

export const workflowIdParamSchema = z.string().regex(/^\d+$/, 'Invalid workflow id')

export const milestoneIdParamSchema = z.string().regex(/^\d+$/, 'Invalid milestone id')

export const createMilestoneBodySchema = z.object({
  name: z.string().trim().min(1).max(500).optional(),
})

export const passCriteriaRowSchema = passCriteriaSchema

export const patchMilestoneSchema = z
  .object({
    /** Free-form text; not trimmed so spaces inside and at edges are preserved. Stored on milestone node `data.goal`. */
    goal: z.string().optional(),
    /** Milestone data (structured JSON); persisted on a child `milestonedata` node. */
    milestoneData: z
      .union([
        campaignBriefMilestoneDataSchema,
        postSchedulerMilestoneDataSchema,
        promotionCandidatesMilestoneDataSchema,
        cultureHooksMilestoneDataSchema,
      ])
      .nullable()
      .optional(),
    /** Typed milestone input; stored on milestone node `data` JSON. */
    milestoneInput: z
      .union([
        z.object({
          type: z.literal('restaurant_campaign_brief'),
          value: campaignBriefMilestoneInputValueSchema,
        }),
        z.object({
          type: z.literal('post_scheduler'),
          value: postSchedulerMilestoneInputValueSchema,
        }),
        z.object({
          type: z.literal('culture_hooks'),
          value: cultureHooksMilestoneInputValueSchema,
        }),
        milestoneInputSchema,
      ])
      .optional(),
    presetId: milestonePresetIdSchema.optional(),
    passCriterias: z.array(passCriteriaRowSchema).optional(),
    move: z.enum(['up', 'down']).optional(),
  })
  .refine(
    (v) =>
      v.goal !== undefined ||
      v.milestoneData !== undefined ||
      v.milestoneInput !== undefined ||
      v.presetId !== undefined ||
      v.passCriterias !== undefined ||
      v.move !== undefined,
    {
      message:
        'Provide at least one of goal, milestoneData, milestoneInput, presetId, passCriterias, or move',
    },
  )
