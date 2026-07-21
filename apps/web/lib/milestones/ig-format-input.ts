import type { TimelineMilestone } from '@/app/(protected)/workflow/_components/timeline/types'
import { parseIgScheduleEntries, type IgMenuPickerEntry } from '@/lib/graphql/node-schemas'
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
  return (parseIgScheduleEntries(priorMenuPicker.data, 'menu') as IgMenuPickerEntry[]).filter(
    (row) => row.slotKey.trim() && row.menuItems.length > 0,
  )
}
