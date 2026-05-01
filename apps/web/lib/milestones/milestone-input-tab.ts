import type { MilestoneInput, MilestonePresetId } from '@/lib/graphql/node-schemas'

/** Presets whose Input tab uses the default optional owner-notes textarea (not custom widgets like dates). */
export function milestonePresetHasDefaultOptionalNotesInput(
  presetId: MilestonePresetId | undefined,
): presetId is Exclude<MilestonePresetId, 'dates'> {
  return presetId !== undefined && presetId !== 'dates'
}

export function optionalNotesFromMilestoneInput(
  raw: MilestoneInput | undefined,
  presetId: Exclude<MilestonePresetId, 'dates'>,
): string {
  if (raw?.type !== presetId || raw.value == null || typeof raw.value !== 'object') {
    return ''
  }
  const n = (raw.value as { notes?: unknown }).notes
  return typeof n === 'string' ? n : ''
}
