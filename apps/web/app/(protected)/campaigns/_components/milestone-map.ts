import type { TimelineMilestone } from './timeline-workspace'

export type MilestoneNodeDto = {
  id: string
  name: string
}

export function milestoneNodeToTimelineMilestone(node: MilestoneNodeDto): TimelineMilestone {
  return {
    id: node.id,
    title: node.name,
    passCriteria: '',
    status: 'empty',
  }
}
