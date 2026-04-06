import type { PassCriteriaRow, TimelineMilestone } from './timeline-workspace'

export type PassCriteriaNodeDto = {
  id: string
  nodeType?: string
  data?: unknown | null
}

export type MilestoneNodeDto = {
  id: string
  name: string
  data?: unknown | null
  passCriteriaNodes?: PassCriteriaNodeDto[]
}

export function passCriteriaFromChildNodes(
  nodes: PassCriteriaNodeDto[] | undefined | null,
): PassCriteriaRow[] {
  if (nodes == null || !Array.isArray(nodes)) {
    return []
  }
  const out: PassCriteriaRow[] = []
  for (const n of nodes) {
    if (n.nodeType != null && n.nodeType !== 'passcriteria') {
      continue
    }
    const d = n.data
    if (d == null || typeof d !== 'object') {
      continue
    }
    const requirement = (d as { requirement?: unknown }).requirement
    const status = (d as { status?: unknown }).status
    if (typeof requirement !== 'string') {
      continue
    }
    if (status !== 'pass' && status !== 'fail' && status !== 'open') {
      continue
    }
    out.push({ id: n.id, requirement, status })
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
