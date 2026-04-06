import { goalDataSchema, milestoneDataSchema, passCriteriaDataSchema } from '@/lib/graphql/node-schemas'
import type { AnyNode } from '@/lib/graphql/queries'

import type { PassCriteriaRow, TimelineMilestone } from './timeline-workspace'

export type MilestoneNodeDto = {
  id: string
  name: string
  data?: unknown | null
  passCriteriaNodes?: AnyNode[]
  goalNodes?: AnyNode[]
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

export function milestoneNodeToTimelineMilestone(node: MilestoneNodeDto): TimelineMilestone {
  const parsed = milestoneDataSchema.safeParse(node.data)
  const legacyGoal = parsed.success ? parsed.data.goal : undefined
  const goal = goalFromChildNodes(node.goalNodes) ?? legacyGoal

  return {
    id: node.id,
    title: node.name,
    goal,
    passCriteria: passCriteriaFromChildNodes(node.passCriteriaNodes),
    status: 'empty',
  }
}
