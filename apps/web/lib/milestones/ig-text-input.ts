import type { TimelineMilestone } from '@/app/(protected)/workflow/_components/timeline/types'
import { igFormatEntrySchema, type IgFormatEntry } from '@/lib/graphql/node-schemas'
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
  const rawEntries = (priorFormat.data as { entries?: unknown }).entries
  if (!Array.isArray(rawEntries)) {
    return []
  }
  const entries: IgFormatEntry[] = []
  for (const raw of rawEntries) {
    const row = igFormatEntrySchema.safeParse(raw)
    if (!row.success || !row.data.slotKey.trim()) {
      continue
    }
    if (!row.data.menuItems?.length || !row.data.type) {
      continue
    }
    entries.push(row.data)
  }
  return entries
}
