import type { MilestoneInput, MilestonePresetId } from '@/lib/graphql/node-schemas'

/** Presets whose Input tab uses the default optional owner-notes textarea (not custom widgets like dates). */
export function milestonePresetHasDefaultOptionalNotesInput(
  presetId: MilestonePresetId | undefined,
): presetId is 'restaurant_brand_brief' | 'promotion_candidates' {
  return presetId === 'restaurant_brand_brief' || presetId === 'promotion_candidates'
}

export function optionalNotesFromMilestoneInput(
  raw: MilestoneInput | undefined,
  presetId: 'restaurant_brand_brief' | 'promotion_candidates',
): string {
  if (raw?.type !== presetId || raw.value == null || typeof raw.value !== 'object') {
    return ''
  }
  const n = (raw.value as { notes?: unknown }).notes
  return typeof n === 'string' ? n : ''
}
