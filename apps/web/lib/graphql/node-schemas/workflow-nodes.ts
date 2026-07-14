/**
 * Zod schemas for workflow node shapes.
 */

import { z } from 'zod'

import { isAllowedChatGatewayModel } from '@/lib/chat/gateway-chat-models'

import {
  campaignBriefMilestoneDataSchema,
  cultureHooksMilestoneDataSchema,
  datesMilestoneDataSchema,
  igProfileMilestoneDataSchema,
  igPlanMilestoneDataSchema,
  igMenuPickerMilestoneDataSchema,
  igFormatMilestoneDataSchema,
  menuTaggerMilestoneDataSchema,
  postLineupMilestoneDataSchema,
  reelLineupMilestoneDataSchema,
  menuClustererMilestoneDataSchema,
  storyLineupMilestoneDataSchema,
  schedulerMilestoneDataSchema,
  milestoneInputSchema,
  milestonePresetIdSchema,
  passCriteriaSchema,
  promotionCandidatesMilestoneDataSchema,
} from './milestone-presets'

export const milestoneDataSchema = z
  .object({
    order: z.number().int().optional(),
    /** Free-form milestone goal; persisted on the milestone node `data` JSON. */
    goal: z.string().optional(),
    presetId: milestonePresetIdSchema.optional(),
    milestoneInput: milestoneInputSchema.optional(),
    passCriterias: z.array(passCriteriaSchema).optional(),
    /** Per-milestone LLM model for agent runs; stored on milestone node `data` JSON. */
    runChatModel: z
      .string()
      .optional()
      .refine((v) => v === undefined || isAllowedChatGatewayModel(v), {
        message: 'Unsupported chat model',
      }),
  })
  .passthrough()

export type MilestoneData = z.infer<typeof milestoneDataSchema>

/** Child `milestonedata` node JSON — structured preset data only (breaking change: no markdown string). */
export const milestonedataValueSchema = z.union([
  schedulerMilestoneDataSchema,
  datesMilestoneDataSchema,
  campaignBriefMilestoneDataSchema,
  promotionCandidatesMilestoneDataSchema,
  cultureHooksMilestoneDataSchema,
  igProfileMilestoneDataSchema,
  igPlanMilestoneDataSchema,
  igMenuPickerMilestoneDataSchema,
  igFormatMilestoneDataSchema,
  menuTaggerMilestoneDataSchema,
  menuClustererMilestoneDataSchema,
  postLineupMilestoneDataSchema,
  reelLineupMilestoneDataSchema,
  storyLineupMilestoneDataSchema,
])

export type MilestonedataValue = z.infer<typeof milestonedataValueSchema>

const resultCriterionSchema = z.object({
  id: z.string(),
  requirement: z.string(),
  status: z.string(),
  reasoning: z.string(),
})

/** Eval result payload on milestone rows (same shape as legacy result child nodes). */
export const resultDataSchema = z.object({
  summary: z.string(),
  passed: z.number().int(),
  total: z.number().int(),
  criteria: z.array(resultCriterionSchema).optional(),
})

export type ResultData = z.infer<typeof resultDataSchema>

const baseNode = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  path: z.string(),
  parentId: z.string().nullable(),
  locationId: z.number().nullable(),
})

export const milestoneNodeSchema = baseNode.extend({
  nodeType: z.literal('milestone'),
  data: milestoneDataSchema.nullable(),
  milestoneGoal: z.string().nullable().optional(),
  milestoneInput: z.unknown().nullable().optional(),
  passCriterias: z.array(passCriteriaSchema).nullable().optional(),
  milestonePresetData: z.unknown().nullable().optional(),
  milestoneResult: resultDataSchema.nullable().optional(),
})

export const passCriteriaNodeSchema = baseNode.extend({
  nodeType: z.literal('passcriteria'),
  data: passCriteriaSchema.omit({ id: true }).nullable(),
})

export const milestonedataNodeSchema = baseNode.extend({
  nodeType: z.literal('milestonedata'),
  data: milestonedataValueSchema.nullable(),
})

/** Legacy child `result` node JSON — matches backend result validation. */
export const resultNodeSchema = baseNode.extend({
  nodeType: z.literal('result'),
  data: resultDataSchema.nullable(),
})

/** Workflow root node `data` JSON. */
export const workflowDataSchema = z
  .object({
    analyticsRunId: z.union([z.number().int().positive(), z.string().regex(/^\d+$/)]).optional(),
  })
  .passthrough()

export type WorkflowData = z.infer<typeof workflowDataSchema>

export const workflowNodeSchema = baseNode.extend({
  nodeType: z.literal('workflow'),
  data: workflowDataSchema.nullable(),
})

export const unknownNodeSchema = baseNode.extend({
  nodeType: z.string(),
  data: z.unknown().nullable(),
})

export const knownNodeSchema = z.discriminatedUnion('nodeType', [
  milestoneNodeSchema,
  passCriteriaNodeSchema,
  milestonedataNodeSchema,
  resultNodeSchema,
  workflowNodeSchema,
])

export type MilestoneNode = z.infer<typeof milestoneNodeSchema>
export type PassCriteriaNode = z.infer<typeof passCriteriaNodeSchema>
export type MilestonedataNode = z.infer<typeof milestonedataNodeSchema>
export type ResultNode = z.infer<typeof resultNodeSchema>
export type WorkflowNode = z.infer<typeof workflowNodeSchema>
export type KnownNode = z.infer<typeof knownNodeSchema>
export type UnknownNode = z.infer<typeof unknownNodeSchema>
export type AnyNode = KnownNode | UnknownNode
