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

export const CUISINE_TYPE_IDS = [
  'italian',
  'indonesian',
  'indian',
  'japanese',
  'chinese',
  'thai',
  'korean',
  'vietnamese',
  'mexican',
  'mediterranean',
  'middle_eastern',
  'american',
  'french',
  'german',
  'spanish',
  'greek',
  'turkish',
  'fusion',
  'seafood',
  'steakhouse',
  'pizza',
  'burger',
  'bakery',
  'dessert',
  'healthy',
  'vegan_friendly',
  'other',
] as const

export const SERVICE_MODE_IDS = [
  'dine_in',
  'takeaway',
  'delivery',
  'catering',
  'private_events',
] as const

export const AMBIENCE_TAG_IDS = [
  'cozy',
  'lively',
  'romantic',
  'family_friendly',
  'quiet',
  'outdoor_seating',
  'dog_friendly',
  'wheelchair_accessible',
] as const

export const POST_LANGUAGE_IDS = [
  'en',
  'de',
  'id',
  'es',
  'fr',
  'it',
  'ja',
  'zh',
  'pt',
  'ar',
  'tr',
  'nl',
] as const

export const DIETARY_OPTION_IDS = [
  'vegetarian',
  'vegan',
  'halal',
  'kosher',
  'gluten_free',
  'nut_free',
  'lactose_free',
] as const

export const PRICE_TIER_IDS = ['budget', 'mid', 'upscale', 'premium'] as const

const INSTAGRAM_HANDLE_MAX_LEN = 32
const NEIGHBORHOOD_MAX_LEN = 80
const VALUE_PROPOSITION_MAX_LEN = 140
const ABOUT_STORY_MAX_LEN = 800
const TOPICS_TO_AVOID_MAX_LEN = 280
const PHONE_MAX_LEN = 30
const EMAIL_MAX_LEN = 254
const URL_MAX_LEN = 500

export const BRIEF_TEXT_MAX_LENGTHS = {
  instagramHandle: INSTAGRAM_HANDLE_MAX_LEN,
  neighborhood: NEIGHBORHOOD_MAX_LEN,
  valueProposition: VALUE_PROPOSITION_MAX_LEN,
  aboutStory: ABOUT_STORY_MAX_LEN,
  topicsToAvoid: TOPICS_TO_AVOID_MAX_LEN,
  phone: PHONE_MAX_LEN,
  contactEmail: EMAIL_MAX_LEN,
  websiteUrl: URL_MAX_LEN,
  reservationUrl: URL_MAX_LEN,
  onlineOrderUrl: URL_MAX_LEN,
  menuUrl: URL_MAX_LEN,
  googleMapsUrl: URL_MAX_LEN,
  notes: 280,
} as const

export type BriefHintsState = {
  // Existing taxonomy + AI hint fields.
  venueConcepts: string[]
  socialGoals: string[]
  guestTags: string[]
  locationFocus: string[]
  tonePresets: string[]
  videoComfort: boolean
  notes: string
  // Positioning taxonomies (Instagram readiness).
  cuisineTypes: string[]
  serviceModes: string[]
  ambienceTags: string[]
  postLanguages: string[]
  dietaryOptions: string[]
  priceTier: string
  servesAlcohol: boolean
  // Identity / contact / discovery free-text.
  instagramHandle: string
  websiteUrl: string
  reservationUrl: string
  onlineOrderUrl: string
  menuUrl: string
  googleMapsUrl: string
  phone: string
  contactEmail: string
  neighborhood: string
  // Brand guardrails free-text.
  valueProposition: string
  aboutStory: string
  topicsToAvoid: string
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
    cuisineTypes: [],
    serviceModes: [],
    ambienceTags: [],
    postLanguages: [],
    dietaryOptions: [],
    priceTier: '',
    servesAlcohol: false,
    instagramHandle: '',
    websiteUrl: '',
    reservationUrl: '',
    onlineOrderUrl: '',
    menuUrl: '',
    googleMapsUrl: '',
    phone: '',
    contactEmail: '',
    neighborhood: '',
    valueProposition: '',
    aboutStory: '',
    topicsToAvoid: '',
  }
}

function parseIdList(raw: unknown, allowed: readonly string[]): string[] {
  if (!Array.isArray(raw)) return []
  return raw.filter((t): t is string => typeof t === 'string' && allowed.includes(t))
}

function parseString(raw: unknown): string {
  return typeof raw === 'string' ? raw : ''
}

function parseEnum(raw: unknown, allowed: readonly string[]): string {
  if (typeof raw !== 'string') return ''
  return allowed.includes(raw) ? raw : ''
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

  base.cuisineTypes = parseIdList(o.cuisineTypes, CUISINE_TYPE_IDS)
  base.serviceModes = parseIdList(o.serviceModes, SERVICE_MODE_IDS)
  base.ambienceTags = parseIdList(o.ambienceTags, AMBIENCE_TAG_IDS)
  base.postLanguages = parseIdList(o.postLanguages, POST_LANGUAGE_IDS)
  base.dietaryOptions = parseIdList(o.dietaryOptions, DIETARY_OPTION_IDS)
  base.priceTier = parseEnum(o.priceTier, PRICE_TIER_IDS)
  if (typeof o.servesAlcohol === 'boolean') {
    base.servesAlcohol = o.servesAlcohol
  }

  base.instagramHandle = parseString(o.instagramHandle)
  base.websiteUrl = parseString(o.websiteUrl)
  base.reservationUrl = parseString(o.reservationUrl)
  base.onlineOrderUrl = parseString(o.onlineOrderUrl)
  base.menuUrl = parseString(o.menuUrl)
  base.googleMapsUrl = parseString(o.googleMapsUrl)
  base.phone = parseString(o.phone)
  base.contactEmail = parseString(o.contactEmail)
  base.neighborhood = parseString(o.neighborhood)
  base.valueProposition = parseString(o.valueProposition)
  base.aboutStory = parseString(o.aboutStory)
  base.topicsToAvoid = parseString(o.topicsToAvoid)

  return base
}

export function buildQuickProfilePayload(state: BriefHintsState): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  if (state.venueConcepts.length > 0) out.venueConcepts = [...state.venueConcepts]
  if (state.socialGoals.length > 0) out.socialGoals = [...state.socialGoals]
  if (state.guestTags.length > 0) out.guestTags = [...state.guestTags]
  if (state.locationFocus.length > 0) out.locationFocus = [...state.locationFocus]
  if (state.tonePresets.length > 0) out.tonePresets = [...state.tonePresets]
  // Always send the boolean so the server stores false (sentinel-clean) or true.
  out.videoComfort = state.videoComfort === true
  out.servesAlcohol = state.servesAlcohol === true
  if (state.notes.trim()) out.notes = state.notes.trim()

  if (state.cuisineTypes.length > 0) out.cuisineTypes = [...state.cuisineTypes]
  if (state.serviceModes.length > 0) out.serviceModes = [...state.serviceModes]
  if (state.ambienceTags.length > 0) out.ambienceTags = [...state.ambienceTags]
  if (state.postLanguages.length > 0) out.postLanguages = [...state.postLanguages]
  if (state.dietaryOptions.length > 0) out.dietaryOptions = [...state.dietaryOptions]
  if (state.priceTier) out.priceTier = state.priceTier

  if (state.instagramHandle.trim()) {
    out.instagramHandle = state.instagramHandle.trim().replace(/^@+/, '')
  }
  for (const key of [
    'websiteUrl',
    'reservationUrl',
    'onlineOrderUrl',
    'menuUrl',
    'googleMapsUrl',
    'phone',
    'contactEmail',
    'neighborhood',
    'valueProposition',
    'aboutStory',
    'topicsToAvoid',
  ] as const) {
    const value = state[key].trim()
    if (value) out[key] = value
  }

  return out
}

export function briefHintsHasAnySelection(state: BriefHintsState): boolean {
  if (
    state.venueConcepts.length > 0 ||
    state.socialGoals.length > 0 ||
    state.guestTags.length > 0 ||
    state.locationFocus.length > 0 ||
    state.tonePresets.length > 0 ||
    state.videoComfort ||
    state.notes.trim() ||
    state.cuisineTypes.length > 0 ||
    state.serviceModes.length > 0 ||
    state.ambienceTags.length > 0 ||
    state.postLanguages.length > 0 ||
    state.dietaryOptions.length > 0 ||
    state.priceTier ||
    state.servesAlcohol
  ) {
    return true
  }
  const textFields: (keyof BriefHintsState)[] = [
    'instagramHandle',
    'websiteUrl',
    'reservationUrl',
    'onlineOrderUrl',
    'menuUrl',
    'googleMapsUrl',
    'phone',
    'contactEmail',
    'neighborhood',
    'valueProposition',
    'aboutStory',
    'topicsToAvoid',
  ]
  return textFields.some((key) => {
    const value = state[key]
    return typeof value === 'string' && value.trim().length > 0
  })
}

/** Toggle an id in a list (multi-select chip). */
export function toggleIdInList(list: string[], id: string): string[] {
  return list.includes(id) ? list.filter((x) => x !== id) : [...list, id]
}
