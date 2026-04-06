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
export const milestoneDataSchema = z
  .object({
    order: z.number().int().optional(),
    /**
     * Legacy: goal text was stored on the milestone. New writes use a child node (`nodeType` `goal`).
     */
    goal: z.string().optional(),
  })
  .passthrough()

export type MilestoneData = z.infer<typeof milestoneDataSchema>

/** Goal child node `data` JSON — matches backend `GoalHandler` validation. */
export const goalDataSchema = z.object({
  goal: z.string(),
})

export type GoalData = z.infer<typeof goalDataSchema>

/** Child `milestonedata` node JSON — matches backend `MilestoneDataHandler` validation. */
export const milestonedataDataSchema = z.object({
  data: z.string(),
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
])

export type MilestoneNode = z.infer<typeof milestoneNodeSchema>
export type PassCriteriaNode = z.infer<typeof passCriteriaNodeSchema>
export type GoalNode = z.infer<typeof goalNodeSchema>
export type MilestonedataNode = z.infer<typeof milestonedataNodeSchema>
export type ResultNode = z.infer<typeof resultNodeSchema>
export type KnownNode = z.infer<typeof knownNodeSchema>
export type UnknownNode = z.infer<typeof unknownNodeSchema>
export type AnyNode = KnownNode | UnknownNode

/**
 * Parse a single node from GraphQL JSON. Tries milestone, passcriteria, goal, milestonedata, result, then falls back
 * to a generic node (campaign, etc.) so callers can still narrow on `nodeType`.
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
