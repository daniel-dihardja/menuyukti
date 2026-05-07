/**
 * Zod schemas and TypeScript types for GraphQL `Node` payloads (single JSON `data` blob per node).
 * Single source of truth for milestone / passcriteria shapes used by the web app.
 */

import { z } from 'zod'

/** Passcriteria `data` JSON — matches backend `PassCriteriaHandler` validation. */
export const passCriteriaDataSchema = z.object({
  requirement: z.string(),
  status: z.enum(['pass', 'fail', 'open']),
})

export type PassCriteriaData = z.infer<typeof passCriteriaDataSchema>

export const milestonePresetIdSchema = z.enum(['restaurant_campaign_brief', 'post_scheduler'])

export type MilestonePresetId = z.infer<typeof milestonePresetIdSchema>

/**
 * Optional owner notes on the milestone Input tab (`value.notes`).
 * Used by the campaign_brief preset.
 */
export const campaignBriefMilestoneInputValueSchema = z.object({
  notes: z.string(),
  startDate: z.string(),
  endDate: z.string(),
})

export type CampaignBriefMilestoneInputValue = z.infer<
  typeof campaignBriefMilestoneInputValueSchema
>

/**
 * Optional owner notes on the milestone Input tab (`value.notes`).
 * Used by the post scheduler preset.
 */
export const postSchedulerMilestoneInputValueSchema = z.object({
  notes: z.string(),
})

export type PostSchedulerMilestoneInputValue = z.infer<
  typeof postSchedulerMilestoneInputValueSchema
>

export const milestoneInputSchema = z.object({
  type: z.string().trim().min(1),
  value: z.unknown().optional(),
})

export type MilestoneInput = z.infer<typeof milestoneInputSchema>

export const campaignWindowPublicHolidaySchema = z.object({
  name: z.string(),
  description: z.string(),
  date: z.string(),
})

export type CampaignWindowPublicHoliday = z.infer<typeof campaignWindowPublicHolidaySchema>

export const campaignBriefVenueSnapshotSchema = z.object({
  venueName: z.string(),
  city: z.string(),
  country: z.string(),
  currency: z.string(),
})

export type CampaignBriefVenueSnapshot = z.infer<typeof campaignBriefVenueSnapshotSchema>

export const campaignBriefMilestoneDataSchema = z.object({
  startDate: z.string(),
  endDate: z.string(),
  publicHolidays: z.array(campaignWindowPublicHolidaySchema),
  venueSnapshot: campaignBriefVenueSnapshotSchema,
  contentPillars: z.array(z.string()),
  audienceHypotheses: z.array(z.string()),
  proofOrientedAngles: z.array(z.string()),
  toneGuardrails: z.array(z.string()),
  campaignObjective: z.string(),
  targetSegments: z.array(z.string()),
  messageHierarchy: z.array(z.string()),
  offerAndCtaPlan: z.array(z.string()),
  contentPillarPlan: z.array(z.string()),
  measurementPlan: z.array(z.string()),
  testingPlan: z.array(z.string()),
  riskGuardrails: z.array(z.string()),
})

export type CampaignBriefMilestoneData = z.infer<typeof campaignBriefMilestoneDataSchema>

export const postSchedulerPostItemSchema = z.object({
  dayOfWeek: z.string(),
  date: z.string(),
  time: z.string(),
  postType: z.enum(['Reel', 'Post']),
  contentType: z.enum(['Carousel', 'Single']),
  promotedMenuItems: z.array(z.string()),
  captionIdea: z.string(),
})

export type PostSchedulerPostItem = z.infer<typeof postSchedulerPostItemSchema>

export const postSchedulerDaySummarySchema = z.object({
  weekdayCount: z.number().int().nonnegative(),
  weekendCount: z.number().int().nonnegative(),
})

export type PostSchedulerDaySummary = z.infer<typeof postSchedulerDaySummarySchema>

export const postSchedulerPromotionCategoryBucketSchema = z.object({
  starItems: z.array(z.string()),
  puzzleItems: z.array(z.string()),
})

export type PostSchedulerPromotionCategoryBucket = z.infer<
  typeof postSchedulerPromotionCategoryBucketSchema
>

export const postSchedulerPromotionCandidatesSchema = z.object({
  grouping: z.string(),
  categories: z.record(z.string(), postSchedulerPromotionCategoryBucketSchema).optional(),
  starItems: z.array(z.string()).optional(),
  puzzleItems: z.array(z.string()).optional(),
})

export type PostSchedulerPromotionCandidates = z.infer<
  typeof postSchedulerPromotionCandidatesSchema
>

export const postSchedulerMilestoneDataSchema = z.object({
  posts: z.array(postSchedulerPostItemSchema),
  daySummary: postSchedulerDaySummarySchema,
  promotionCandidates: postSchedulerPromotionCandidatesSchema.optional(),
})

export type PostSchedulerMilestoneData = z.infer<typeof postSchedulerMilestoneDataSchema>

export const milestoneDataSchema = z
  .object({
    order: z.number().int().optional(),
    /**
     * Legacy: goal text was stored on the milestone. New writes use a child node (`nodeType` `goal`).
     */
    goal: z.string().optional(),
    presetId: milestonePresetIdSchema.optional(),
    milestoneInput: milestoneInputSchema.optional(),
  })
  .passthrough()

export type MilestoneData = z.infer<typeof milestoneDataSchema>

/** Goal child node `data` JSON — matches backend `GoalHandler` validation. */
export const goalDataSchema = z.object({
  goal: z.string(),
})

export type GoalData = z.infer<typeof goalDataSchema>

/** Child `milestonedata` node JSON — structured preset data only (breaking change: no markdown string). */
export const milestonedataValueSchema = z.union([
  campaignBriefMilestoneDataSchema,
  postSchedulerMilestoneDataSchema,
])

export type MilestonedataValue = z.infer<typeof milestonedataValueSchema>

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
})

export const passCriteriaNodeSchema = baseNode.extend({
  nodeType: z.literal('passcriteria'),
  data: passCriteriaDataSchema.nullable(),
})

export const goalNodeSchema = baseNode.extend({
  nodeType: z.literal('goal'),
  data: goalDataSchema.nullable(),
})

export const milestonedataNodeSchema = baseNode.extend({
  nodeType: z.literal('milestonedata'),
  data: milestonedataValueSchema.nullable(),
})

const resultCriterionSchema = z.object({
  id: z.string(),
  requirement: z.string(),
  status: z.string(),
  reasoning: z.string(),
})

/** Child `result` node JSON — matches backend `ResultHandler` validation. */
export const resultDataSchema = z.object({
  summary: z.string(),
  passed: z.number().int(),
  total: z.number().int(),
  criteria: z.array(resultCriterionSchema).optional(),
})

export type ResultData = z.infer<typeof resultDataSchema>

export const resultNodeSchema = baseNode.extend({
  nodeType: z.literal('result'),
  data: resultDataSchema.nullable(),
})

/** Workflow root node `data` JSON. */
export const workflowDataSchema = z
  .object({
    analyticsRunId: z.number().optional(),
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
  goalNodeSchema,
  milestonedataNodeSchema,
  resultNodeSchema,
  workflowNodeSchema,
])

export type MilestoneNode = z.infer<typeof milestoneNodeSchema>
export type PassCriteriaNode = z.infer<typeof passCriteriaNodeSchema>
export type GoalNode = z.infer<typeof goalNodeSchema>
export type MilestonedataNode = z.infer<typeof milestonedataNodeSchema>
export type ResultNode = z.infer<typeof resultNodeSchema>
export type WorkflowNode = z.infer<typeof workflowNodeSchema>
export type KnownNode = z.infer<typeof knownNodeSchema>
export type UnknownNode = z.infer<typeof unknownNodeSchema>
export type AnyNode = KnownNode | UnknownNode

/**
 * Parse a single node from GraphQL JSON. Tries milestone, passcriteria, goal, milestonedata, result, workflow, then
 * falls back to a generic node so callers can still narrow on `nodeType`.
 */
export function parseNode(raw: unknown): AnyNode {
  const m = milestoneNodeSchema.safeParse(raw)
  if (m.success) {
    return m.data
  }
  const p = passCriteriaNodeSchema.safeParse(raw)
  if (p.success) {
    return p.data
  }
  const g = goalNodeSchema.safeParse(raw)
  if (g.success) {
    return g.data
  }
  const md = milestonedataNodeSchema.safeParse(raw)
  if (md.success) {
    return md.data
  }
  const r = resultNodeSchema.safeParse(raw)
  if (r.success) {
    return r.data
  }
  const w = workflowNodeSchema.safeParse(raw)
  if (w.success) {
    return w.data
  }
  const u = unknownNodeSchema.safeParse(raw)
  if (u.success) {
    return u.data
  }
  throw new Error(
    `Invalid node shape: ${typeof raw === 'object' && raw !== null ? JSON.stringify(raw) : String(raw)}`,
  )
}

export function parseNodeNullable(raw: unknown | null): AnyNode | null {
  if (raw == null) {
    return null
  }
  return parseNode(raw)
}

export function parseNodes(raw: unknown): AnyNode[] {
  if (!Array.isArray(raw)) {
    return []
  }
  return raw.map(parseNode)
}
