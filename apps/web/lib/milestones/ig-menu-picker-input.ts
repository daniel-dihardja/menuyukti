import type { TimelineMilestone } from '@/app/(protected)/workflow/_components/timeline/types'
import {
  igPlanMilestoneDataSchema,
  igPlanEntrySchema,
  type IgPlanEntry,
} from '@/lib/graphql/node-schemas'

export const IG_MENU_PICKER_NONE_SELECTED_SENTINEL = '__no_slots_selected__'

export function isIgMenuPickerNoneSelected(selectedSlotKeys: string[]): boolean {
  return (
    selectedSlotKeys.length === 1 && selectedSlotKeys[0] === IG_MENU_PICKER_NONE_SELECTED_SENTINEL
  )
}

export function isIgMenuPickerAllSelected(selectedSlotKeys: string[]): boolean {
  return selectedSlotKeys.length === 0
}

export function isIgMenuPickerSlotSelected(slotKey: string, selectedSlotKeys: string[]): boolean {
  if (isIgMenuPickerNoneSelected(selectedSlotKeys)) {
    return false
  }
  if (isIgMenuPickerAllSelected(selectedSlotKeys)) {
    return true
  }
  return selectedSlotKeys.includes(slotKey)
}

/** Returns normalized selectedSlotKeys after toggling one slot. */
export function toggleIgMenuPickerSlotKey(
  selectedSlotKeys: string[],
  allSlotKeys: string[],
  slotKey: string,
  checked: boolean,
): string[] {
  let effectiveSelected: string[]
  if (isIgMenuPickerAllSelected(selectedSlotKeys)) {
    effectiveSelected = [...allSlotKeys]
  } else if (isIgMenuPickerNoneSelected(selectedSlotKeys)) {
    effectiveSelected = []
  } else {
    effectiveSelected = [...selectedSlotKeys]
  }

  let next: string[]
  if (checked) {
    next = effectiveSelected.includes(slotKey) ? effectiveSelected : [...effectiveSelected, slotKey]
  } else {
    next = effectiveSelected.filter((key) => key !== slotKey)
  }

  if (next.length === allSlotKeys.length) {
    return []
  }
  if (next.length === 0) {
    return [IG_MENU_PICKER_NONE_SELECTED_SENTINEL]
  }
  return next
}

export function findPriorIgPlanMilestone(
  milestones: TimelineMilestone[],
  currentMilestoneId: string,
): TimelineMilestone | undefined {
  const index = milestones.findIndex((milestone) => milestone.id === currentMilestoneId)
  if (index < 0) {
    return undefined
  }

  for (let i = index - 1; i >= 0; i -= 1) {
    if (milestones[i]?.presetId === 'ig_plan') {
      return milestones[i]
    }
  }

  return undefined
}

export function resolveIgPlanEntriesForMenuPicker(
  milestones: TimelineMilestone[],
  currentMilestoneId: string,
): IgPlanEntry[] {
  const priorIgPlan = findPriorIgPlanMilestone(milestones, currentMilestoneId)
  if (!priorIgPlan) {
    return []
  }
  const parsed = igPlanMilestoneDataSchema.safeParse(priorIgPlan.data)
  if (!parsed.success) {
    return []
  }
  const entries: IgPlanEntry[] = []
  for (const raw of parsed.data.entries ?? []) {
    const row = igPlanEntrySchema.safeParse(raw)
    if (row.success && row.data.slotKey.trim()) {
      entries.push(row.data)
    }
  }
  return entries
}
