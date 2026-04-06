import {
  goalDataSchema,
  milestoneDataSchema,
  milestonedataDataSchema,
  passCriteriaDataSchema,
  resultDataSchema,
} from '@/lib/graphql/node-schemas'
import type { AnyNode } from '@/lib/graphql/queries'

import type {
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
): string | undefined {
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
    const parsed = milestonedataDataSchema.safeParse(d)
    if (parsed.success) {
      return parsed.data.data
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

export function milestoneNodeToTimelineMilestone(node: MilestoneNodeDto): TimelineMilestone {
  const parsed = milestoneDataSchema.safeParse(node.data)
  const legacyGoal = parsed.success ? parsed.data.goal : undefined
  const goal = goalFromChildNodes(node.goalNodes) ?? legacyGoal
  const data = milestoneDataFromChildNodes(node.milestonedataNodes)
  const passCriteria = passCriteriaFromChildNodes(node.passCriteriaNodes)
  const resultMarkdown = resultMarkdownFromChildNodes(node.resultNodes)

  return {
    id: node.id,
    title: node.name,
    goal,
    data,
    passCriteria,
    resultMarkdown,
    status: deriveMilestoneRailStatus(passCriteria, resultMarkdown),
  }
}
