import type { TimelineMilestone } from '@/app/(protected)/workflow/_components/timeline/types'
import { igFormatEntrySchema, type IgFormatEntry } from '@/lib/graphql/node-schemas'

export function findPriorIgFormatMilestone(
  milestones: TimelineMilestone[],
  currentMilestoneId: string,
): TimelineMilestone | undefined {
  const index = milestones.findIndex((milestone) => milestone.id === currentMilestoneId)
  if (index < 0) {
    return undefined
  }

  for (let i = index - 1; i >= 0; i -= 1) {
    if (milestones[i]?.presetId === 'ig_format') {
      return milestones[i]
    }
  }

  return undefined
}

export function resolveIgFormatEntriesForText(
  milestones: TimelineMilestone[],
  currentMilestoneId: string,
): IgFormatEntry[] {
  const priorFormat = findPriorIgFormatMilestone(milestones, currentMilestoneId)
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
