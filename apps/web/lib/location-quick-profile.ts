/** IDs must match `graphql/services/manual_quick_profile.py` allowlists. */

export const VENUE_CONCEPT_IDS = [
  'cafe',
  'bistro',
  'restaurant',
  'fast_casual',
  'bar',
  'bakery_cafe',
  'fine_dining',
  'other',
] as const

export const SOCIAL_GOAL_IDS = [
  'awareness',
  'reservations',
  'walk_ins',
  'delivery',
  'events',
  'community',
] as const

export const GUEST_TAG_IDS = [
  'office_lunch',
  'tourists',
  'families',
  'date_night',
  'nightlife',
  'neighborhood_locals',
  'students',
] as const

export const TONE_PRESET_IDS = ['warm', 'professional', 'playful', 'minimal', 'bold'] as const

export const LOCATION_FOCUS_IDS = ['breakfast', 'brunch', 'lunch', 'dinner'] as const

export type BriefHintsState = {
  venueConcepts: string[]
  socialGoals: string[]
  guestTags: string[]
  locationFocus: string[]
  tonePresets: string[]
  videoComfort: boolean
  notes: string
}

export function defaultBriefHintsState(): BriefHintsState {
  return {
    venueConcepts: [],
    socialGoals: [],
    guestTags: [],
    locationFocus: [],
    tonePresets: [],
    videoComfort: false,
    notes: '',
  }
}

function parseIdList(raw: unknown, allowed: readonly string[]): string[] {
  if (!Array.isArray(raw)) return []
  return raw.filter((t): t is string => typeof t === 'string' && allowed.includes(t))
}

export function briefHintsFromQuickProfile(raw: unknown): BriefHintsState {
  const base = defaultBriefHintsState()
  if (!raw || typeof raw !== 'object') return base
  const o = raw as Record<string, unknown>

  const vcs = o.venueConcepts
  if (Array.isArray(vcs)) {
    base.venueConcepts = parseIdList(vcs, VENUE_CONCEPT_IDS)
  }
  const legacyVc = o.venueConcept
  if (typeof legacyVc === 'string' && (VENUE_CONCEPT_IDS as readonly string[]).includes(legacyVc)) {
    if (!base.venueConcepts.includes(legacyVc)) {
      base.venueConcepts = [...base.venueConcepts, legacyVc]
    }
  }

  base.socialGoals = parseIdList(o.socialGoals, SOCIAL_GOAL_IDS)

  base.guestTags = parseIdList(o.guestTags, GUEST_TAG_IDS)

  base.locationFocus = parseIdList(o.locationFocus, LOCATION_FOCUS_IDS)

  const tps = o.tonePresets
  if (Array.isArray(tps)) {
    base.tonePresets = parseIdList(tps, TONE_PRESET_IDS)
  }
  const legacyTp = o.tonePreset
  if (typeof legacyTp === 'string' && (TONE_PRESET_IDS as readonly string[]).includes(legacyTp)) {
    if (!base.tonePresets.includes(legacyTp)) {
      base.tonePresets = [...base.tonePresets, legacyTp]
    }
  }

  if (typeof o.videoComfort === 'boolean') {
    base.videoComfort = o.videoComfort
  }
  if (typeof o.notes === 'string') {
    base.notes = o.notes
  }
  return base
}

export function buildQuickProfilePayload(state: BriefHintsState): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  if (state.venueConcepts.length > 0) out.venueConcepts = [...state.venueConcepts]
  if (state.socialGoals.length > 0) out.socialGoals = [...state.socialGoals]
  if (state.guestTags.length > 0) out.guestTags = [...state.guestTags]
  if (state.locationFocus.length > 0) out.locationFocus = [...state.locationFocus]
  if (state.tonePresets.length > 0) out.tonePresets = [...state.tonePresets]
  if (state.videoComfort) {
    out.videoComfort = true
  } else {
    out.videoComfort = false
  }
  if (state.notes.trim()) out.notes = state.notes.trim()
  return out
}

export function briefHintsHasAnySelection(state: BriefHintsState): boolean {
  return Boolean(
    state.venueConcepts.length > 0 ||
    state.socialGoals.length > 0 ||
    state.guestTags.length > 0 ||
    state.locationFocus.length > 0 ||
    state.tonePresets.length > 0 ||
    state.videoComfort ||
    state.notes.trim(),
  )
}

/** Toggle an id in a list (multi-select chip). */
export function toggleIdInList(list: string[], id: string): string[] {
  return list.includes(id) ? list.filter((x) => x !== id) : [...list, id]
}
