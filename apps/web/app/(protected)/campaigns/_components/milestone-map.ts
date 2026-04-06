import { passCriteriaDataSchema } from '@/lib/graphql/node-schemas'
import type { AnyNode } from '@/lib/graphql/queries'

import type { PassCriteriaRow, TimelineMilestone } from './timeline-workspace'

export type MilestoneNodeDto = {
  id: string
  name: string
  data?: unknown | null
  passCriteriaNodes?: AnyNode[]
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

export function milestoneNodeToTimelineMilestone(node: MilestoneNodeDto): TimelineMilestone {
  return {
    id: node.id,
    title: node.name,
    passCriteria: passCriteriaFromChildNodes(node.passCriteriaNodes),
    status: 'empty',
  }
}
