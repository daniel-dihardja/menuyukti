import type { TimelineMilestone } from '@/app/(protected)/workflow/_components/timeline/types'
import { parseIgScheduleEntries, type IgFormatEntry } from '@/lib/graphql/node-schemas'
import {
  resolveDependencyMilestone,
  selectedDependencyIdFromInput,
} from '@/lib/milestones/milestone-dependencies'

export function findPriorIgFormatMilestone(
  milestones: TimelineMilestone[],
  currentMilestoneId: string,
  selectedId?: string,
): TimelineMilestone | undefined {
  return resolveDependencyMilestone(milestones, currentMilestoneId, 'ig_format', selectedId)
}

export function resolveIgFormatEntriesForText(
  milestones: TimelineMilestone[],
  currentMilestoneId: string,
  milestoneInput?: { value?: unknown },
): IgFormatEntry[] {
  const selectedId = selectedDependencyIdFromInput(milestoneInput, 'sourceIgFormatMilestoneId')
  const priorFormat = findPriorIgFormatMilestone(milestones, currentMilestoneId, selectedId)
  if (!priorFormat?.data || typeof priorFormat.data !== 'object') {
    return []
  }
  return (parseIgScheduleEntries(priorFormat.data, 'format') as IgFormatEntry[]).filter(
    (row) => row.slotKey.trim() && row.menuItems.length > 0 && row.type,
  )
}
