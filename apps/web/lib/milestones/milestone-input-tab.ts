import type { MilestoneInput, MilestonePresetId } from '@/lib/graphql/node-schemas'

/** Presets whose Input tab uses the default optional owner-notes textarea (not custom widgets like dates). */
export function milestonePresetHasDefaultOptionalNotesInput(
  presetId: MilestonePresetId | undefined,
): presetId is 'restaurant_campaign_brief' | 'post_scheduler' {
  return presetId === 'restaurant_campaign_brief' || presetId === 'post_scheduler'
}

export function optionalNotesFromMilestoneInput(
  raw: MilestoneInput | undefined,
  presetId: 'restaurant_campaign_brief' | 'post_scheduler',
): string {
  if (raw?.type !== presetId || raw.value == null || typeof raw.value !== 'object') {
    return ''
  }
  const n = (raw.value as { notes?: unknown }).notes
  return typeof n === 'string' ? n : ''
}
