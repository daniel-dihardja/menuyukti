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

/** Milestone `data` JSON — `order` is the display sequence. */
export const milestoneRunSkillModeSchema = z.enum(['auto', 'fixed'])

export type MilestoneRunSkillMode = z.infer<typeof milestoneRunSkillModeSchema>

export const milestonePresetIdSchema = z.enum([
  'dates',
  'restaurant_brand_brief',
  'promotion_candidates',
])

export type MilestonePresetId = z.infer<typeof milestonePresetIdSchema>

export const datesMilestoneInputSchema = z.object({
  startDate: z.string(),
  endDate: z.string(),
})

export type DatesMilestoneInput = z.infer<typeof datesMilestoneInputSchema>

export const milestoneInputSchema = z.object({
  type: z.string().trim().min(1),
  value: z.unknown().optional(),
})

export type MilestoneInput = z.infer<typeof milestoneInputSchema>

export const datesPublicHolidaySchema = z.object({
  name: z.string(),
  description: z.string(),
  date: z.string(),
})

export type DatesPublicHoliday = z.infer<typeof datesPublicHolidaySchema>

export const datesMilestoneDataSchema = z.object({
  startDate: z.string(),
  endDate: z.string(),
  publicHolidays: z.array(datesPublicHolidaySchema),
})

export type DatesMilestoneData = z.infer<typeof datesMilestoneDataSchema>

export const brandBriefVenueSnapshotSchema = z.object({
  venueName: z.string(),
  city: z.string(),
  country: z.string(),
  currency: z.string(),
})

export type BrandBriefVenueSnapshot = z.infer<typeof brandBriefVenueSnapshotSchema>

export const brandBriefMilestoneDataSchema = z.object({
  venueSnapshot: brandBriefVenueSnapshotSchema,
  contentPillars: z.array(z.string()),
  audienceHypotheses: z.array(z.string()),
  proofOrientedAngles: z.array(z.string()),
  toneGuardrails: z.array(z.string()),
})

export type BrandBriefMilestoneData = z.infer<typeof brandBriefMilestoneDataSchema>

/** Instagram promotion guidance for one candidate menu item. */
export const promotionInstagramPromotionSchema = z.object({
  angle: z.string(),
  format: z.string(),
  cta: z.string(),
  timing: z.string(),
})

export type PromotionInstagramPromotion = z.infer<typeof promotionInstagramPromotionSchema>

/** One curated promotion candidate (POS-exact menu name + rationale + optional puzzle analysis). */
export const promotionCandidateItemSchema = z.object({
  menu: z.string(),
  rationale: z.array(z.string()),
  puzzleAnalysis: z.string().optional(),
  instagramPromotion: promotionInstagramPromotionSchema.optional(),
})

export type PromotionCandidateItem = z.infer<typeof promotionCandidateItemSchema>

/** Summary counts for the puzzle opportunity pool (from analytics + menu engineering). */
export const promotionPuzzleOpportunityPoolSchema = z.object({
  puzzleItemsFound: z.number().int().nonnegative(),
  threshold: z.number(),
  selectedCount: z.number().int().nonnegative(),
})

export type PromotionPuzzleOpportunityPool = z.infer<typeof promotionPuzzleOpportunityPoolSchema>

/** Prior milestone alignment notes (filled by the milestone agent). */
export const promotionCandidatesContextSchema = z.object({
  campaignWindowNotes: z.string().optional(),
  brandBriefAlignmentNotes: z.string().optional(),
})

export type PromotionCandidatesContext = z.infer<typeof promotionCandidatesContextSchema>

/** One ranked row from promotion signals (extra fields allowed from analytics). */
export const promotionRankedCandidateSchema = z
  .object({
    menu: z.string(),
    recommendation: z.string(),
    score: z.number(),
    quantity: z.number().int(),
    totalRevenue: z.number(),
    signalReasons: z.array(z.string()),
  })
  .passthrough()

export type PromotionRankedCandidate = z.infer<typeof promotionRankedCandidateSchema>

/** Structured Data tab for the Promotion Candidates milestone preset. */
export const promotionCandidatesMilestoneDataSchema = z.object({
  placement: z.string(),
  puzzleOpportunityPool: promotionPuzzleOpportunityPoolSchema,
  promotionCandidates: z.array(promotionCandidateItemSchema),
  rankedCandidates: z.array(promotionRankedCandidateSchema),
  context: promotionCandidatesContextSchema.optional(),
})

export type PromotionCandidatesMilestoneData = z.infer<
  typeof promotionCandidatesMilestoneDataSchema
>

export function emptyPromotionCandidatesMilestoneData(
  placement = '',
): PromotionCandidatesMilestoneData {
  return {
    placement,
    puzzleOpportunityPool: {
      puzzleItemsFound: 0,
      threshold: 0,
      selectedCount: 0,
    },
    promotionCandidates: [],
    rankedCandidates: [],
    context: {},
  }
}

export const milestoneDataSchema = z
  .object({
    order: z.number().int().optional(),
    /**
     * Legacy: goal text was stored on the milestone. New writes use a child node (`nodeType` `goal`).
     */
    goal: z.string().optional(),
    /** Legacy values may exist in DB; new writes use `manual` only (see web PATCH schema). */
    dataTask: z.string().optional(),
    /**
     * Milestone agent run: `auto` uses LLM skill selection; `fixed` uses `milestoneRunSkillIds` (max 2).
     * Omitted defaults to auto in agents.
     */
    milestoneRunSkillMode: milestoneRunSkillModeSchema.optional(),
    milestoneRunSkillIds: z.array(z.string()).max(2).optional(),
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
  datesMilestoneDataSchema,
  brandBriefMilestoneDataSchema,
  promotionCandidatesMilestoneDataSchema,
])

export type MilestonedataValue = z.infer<typeof milestonedataValueSchema>

export const milestonedataDataSchema = z.object({
  data: milestonedataValueSchema,
})

export type MilestonedataData = z.infer<typeof milestonedataDataSchema>

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
  data: milestonedataDataSchema.nullable(),
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

/** Workflow root node `data` JSON — e.g. `{ "goal": "..." }`. */
export const workflowDataSchema = z
  .object({
    goal: z.string().optional(),
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
