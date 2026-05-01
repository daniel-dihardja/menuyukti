import {
  brandBriefMilestoneDataSchema,
  datesMilestoneDataSchema,
  goalDataSchema,
  milestoneDataSchema,
  milestoneInputSchema,
  milestonedataValueSchema,
  passCriteriaDataSchema,
  resultDataSchema,
} from '@/lib/graphql/node-schemas'
import type { AnyNode } from '@/lib/graphql/queries'

import type {
  MilestoneInput,
  MilestoneRunSkillMode,
  MilestonePresetId,
  MilestoneDataValue,
  PassCriteriaRow,
  TimelineMilestone,
  TimelineMilestoneStatus,
} from './timeline-workspace'

/** Rail icon state from persisted pass criteria + optional result (single source for SSR + client). */
export function deriveMilestoneRailStatus(
  passCriteria: PassCriteriaRow[],
  resultMarkdown?: string,
): TimelineMilestoneStatus {
  const rows = passCriteria
  if (rows.length === 0) {
    return resultMarkdown?.trim() ? 'complete' : 'empty'
  }
  if (rows.some((r) => r.status === 'fail')) {
    return 'failed'
  }
  if (rows.every((r) => r.status === 'pass')) {
    return 'complete'
  }
  return 'pending'
}

export type MilestoneNodeDto = {
  id: string
  name: string
  data?: unknown | null
  passCriteriaNodes?: AnyNode[]
  goalNodes?: AnyNode[]
  milestonedataNodes?: AnyNode[]
  resultNodes?: AnyNode[]
}

export function passCriteriaFromChildNodes(nodes: AnyNode[] | undefined | null): PassCriteriaRow[] {
  if (nodes == null || !Array.isArray(nodes)) {
    return []
  }
  const out: PassCriteriaRow[] = []
  for (const n of nodes) {
    if (n.nodeType !== 'passcriteria') {
      continue
    }
    const d = n.data
    if (d == null || typeof d !== 'object') {
      continue
    }
    const parsed = passCriteriaDataSchema.safeParse(d)
    if (!parsed.success) {
      continue
    }
    out.push({ id: n.id, requirement: parsed.data.requirement, status: parsed.data.status })
  }
  return out
}

/** First valid `goal` child wins (at most one is expected). */
export function goalFromChildNodes(nodes: AnyNode[] | undefined | null): string | undefined {
  if (nodes == null || !Array.isArray(nodes)) {
    return undefined
  }
  for (const n of nodes) {
    if (n.nodeType !== 'goal') {
      continue
    }
    const d = n.data
    if (d == null || typeof d !== 'object') {
      continue
    }
    const parsed = goalDataSchema.safeParse(d)
    if (parsed.success) {
      return parsed.data.goal
    }
  }
  return undefined
}

/** First valid `milestonedata` child wins (at most one is expected). */
export function milestoneDataFromChildNodes(
  nodes: AnyNode[] | undefined | null,
): MilestoneDataValue | undefined {
  if (nodes == null || !Array.isArray(nodes)) {
    return undefined
  }
  for (const n of nodes) {
    if (n.nodeType !== 'milestonedata') {
      continue
    }
    const d = n.data
    if (d == null || typeof d !== 'object') {
      continue
    }
    const parsed = milestonedataValueSchema.safeParse(d)
    if (parsed.success) {
      return parsed.data
    }
  }
  return undefined
}

/** First valid `result` child wins (at most one is expected). */
export function resultMarkdownFromChildNodes(
  nodes: AnyNode[] | undefined | null,
): string | undefined {
  if (nodes == null || !Array.isArray(nodes)) {
    return undefined
  }
  for (const n of nodes) {
    if (n.nodeType !== 'result') {
      continue
    }
    const d = n.data
    if (d == null || typeof d !== 'object') {
      continue
    }
    const parsed = resultDataSchema.safeParse(d)
    if (parsed.success) {
      return parsed.data.summary
    }
  }
  return undefined
}

function milestoneRunSkillFieldsFromData(data: unknown): {
  milestoneRunSkillMode: MilestoneRunSkillMode
  milestoneRunSkillIds: string[]
  presetId?: MilestonePresetId
  milestoneInput?: MilestoneInput
} {
  const parsed = milestoneDataSchema.safeParse(data)
  let milestoneRunSkillMode: MilestoneRunSkillMode = 'auto'
  let milestoneRunSkillIds: string[] = []
  let presetId: MilestonePresetId | undefined
  let milestoneInput: MilestoneInput | undefined
  if (parsed.success) {
    if (parsed.data.milestoneRunSkillMode === 'fixed') {
      milestoneRunSkillMode = 'fixed'
    }
    if (Array.isArray(parsed.data.milestoneRunSkillIds)) {
      milestoneRunSkillIds = parsed.data.milestoneRunSkillIds.filter(
        (x): x is string => typeof x === 'string' && x.trim().length > 0,
      )
    }
    if (parsed.data.presetId !== undefined) {
      presetId = parsed.data.presetId
    }
    if (parsed.data.milestoneInput !== undefined) {
      const inputParsed = milestoneInputSchema.safeParse(parsed.data.milestoneInput)
      if (inputParsed.success) {
        milestoneInput = inputParsed.data
      }
    }
  }
  return { milestoneRunSkillMode, milestoneRunSkillIds, presetId, milestoneInput }
}

export function milestoneNodeToTimelineMilestone(node: MilestoneNodeDto): TimelineMilestone {
  const parsed = milestoneDataSchema.safeParse(node.data)
  const legacyGoal = parsed.success ? parsed.data.goal : undefined
  const goal = goalFromChildNodes(node.goalNodes) ?? legacyGoal
  const data = milestoneDataFromChildNodes(node.milestonedataNodes)
  const passCriteria = passCriteriaFromChildNodes(node.passCriteriaNodes)
  const resultMarkdown = resultMarkdownFromChildNodes(node.resultNodes)
  const { milestoneRunSkillMode, milestoneRunSkillIds, presetId, milestoneInput } =
    milestoneRunSkillFieldsFromData(node.data)
  let normalizedData = data
  if (presetId === 'dates') {
    const parsedDatesData = datesMilestoneDataSchema.safeParse(data)
    if (parsedDatesData.success) {
      normalizedData = parsedDatesData.data
    }
  }
  if (presetId === 'restaurant_brand_brief') {
    const parsedBrandBriefData = brandBriefMilestoneDataSchema.safeParse(data)
    if (parsedBrandBriefData.success) {
      normalizedData = parsedBrandBriefData.data
    } else {
      normalizedData = {
        venueSnapshot: {
          venueName: '',
          city: '',
          country: '',
          currency: '',
        },
        contentPillars: [],
        audienceHypotheses: [],
        proofOrientedAngles: [],
        toneGuardrails: [],
      }
    }
  }
  return {
    id: node.id,
    title: node.name,
    goal,
    data: normalizedData,
    milestoneRunSkillMode,
    milestoneRunSkillIds,
    presetId,
    milestoneInput,
    passCriteria,
    resultMarkdown,
    status: deriveMilestoneRailStatus(passCriteria, resultMarkdown),
  }
}
