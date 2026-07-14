import type { TimelineMilestone } from '@/app/(protected)/workflow/_components/timeline/types'
import {
  igPlanMilestoneDataSchema,
  igPlanEntrySchema,
  type IgPlanEntry,
} from '@/lib/graphql/node-schemas'

export const IG_MENU_PICKER_NONE_SELECTED_SENTINEL = '__no_slots_selected__'

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
