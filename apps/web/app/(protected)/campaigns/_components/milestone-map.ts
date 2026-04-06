import type { PassCriteriaRow, TimelineMilestone } from './timeline-workspace'

export type MilestoneNodeDto = {
  id: string
  name: string
  data?: unknown | null
}

export function passCriteriaFromNodeData(data: unknown | null | undefined): PassCriteriaRow[] {
  if (data == null || typeof data !== 'object') {
    return []
  }
  const raw = (data as { passCriteria?: unknown }).passCriteria
  if (!Array.isArray(raw)) {
    return []
  }
  const out: PassCriteriaRow[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') {
      continue
    }
    const text = (item as { text?: unknown }).text
    const status = (item as { status?: unknown }).status
    if (typeof text !== 'string') {
      continue
    }
    if (status !== 'pass' && status !== 'fail' && status !== 'neutral') {
      continue
    }
    out.push({ text, status })
  }
  return out
}

export function milestoneNodeToTimelineMilestone(node: MilestoneNodeDto): TimelineMilestone {
  return {
    id: node.id,
    title: node.name,
    passCriteria: passCriteriaFromNodeData(node.data),
    status: 'empty',
  }
}
