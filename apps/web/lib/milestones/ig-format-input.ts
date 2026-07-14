import type { TimelineMilestone } from '@/app/(protected)/workflow/_components/timeline/types'
import { igMenuPickerEntrySchema, type IgMenuPickerEntry } from '@/lib/graphql/node-schemas'

export function findPriorIgMenuPickerMilestone(
  milestones: TimelineMilestone[],
  currentMilestoneId: string,
): TimelineMilestone | undefined {
  const index = milestones.findIndex((milestone) => milestone.id === currentMilestoneId)
  if (index < 0) {
    return undefined
  }

  for (let i = index - 1; i >= 0; i -= 1) {
    if (milestones[i]?.presetId === 'ig_menu_picker') {
      return milestones[i]
    }
  }

  return undefined
}

export function resolveIgMenuPickerEntriesForFormat(
  milestones: TimelineMilestone[],
  currentMilestoneId: string,
): IgMenuPickerEntry[] {
  const priorMenuPicker = findPriorIgMenuPickerMilestone(milestones, currentMilestoneId)
  if (!priorMenuPicker?.data || typeof priorMenuPicker.data !== 'object') {
    return []
  }
  const rawEntries = (priorMenuPicker.data as { entries?: unknown }).entries
  if (!Array.isArray(rawEntries)) {
    return []
  }
  const entries: IgMenuPickerEntry[] = []
  for (const raw of rawEntries) {
    const row = igMenuPickerEntrySchema.safeParse(raw)
    if (!row.success || !row.data.slotKey.trim()) {
      continue
    }
    if (!row.data.menuItems?.length) {
      continue
    }
    entries.push(row.data)
  }
  return entries
}
