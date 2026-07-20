import type { TimelineMilestone } from '@/app/(protected)/workflow/_components/timeline/types'
import { igMenuPickerEntrySchema, type IgMenuPickerEntry } from '@/lib/graphql/node-schemas'
import {
  resolveDependencyMilestone,
  selectedDependencyIdFromInput,
} from '@/lib/milestones/milestone-dependencies'

export function findPriorIgMenuPickerMilestone(
  milestones: TimelineMilestone[],
  currentMilestoneId: string,
  selectedId?: string,
): TimelineMilestone | undefined {
  return resolveDependencyMilestone(milestones, currentMilestoneId, 'ig_menu_picker', selectedId)
}

export function resolveIgMenuPickerEntriesForFormat(
  milestones: TimelineMilestone[],
  currentMilestoneId: string,
  milestoneInput?: { value?: unknown },
): IgMenuPickerEntry[] {
  const selectedId = selectedDependencyIdFromInput(milestoneInput, 'sourceIgMenuPickerMilestoneId')
  const priorMenuPicker = findPriorIgMenuPickerMilestone(milestones, currentMilestoneId, selectedId)
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
