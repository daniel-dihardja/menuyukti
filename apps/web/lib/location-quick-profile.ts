const INSTAGRAM_HANDLE_MAX_LEN = 32
const NEIGHBORHOOD_MAX_LEN = 80
const PHONE_MAX_LEN = 30
const EMAIL_MAX_LEN = 254
const URL_MAX_LEN = 500

export const BRIEF_TEXT_MAX_LENGTHS = {
  instagramHandle: INSTAGRAM_HANDLE_MAX_LEN,
  neighborhood: NEIGHBORHOOD_MAX_LEN,
  phone: PHONE_MAX_LEN,
  contactEmail: EMAIL_MAX_LEN,
  websiteUrl: URL_MAX_LEN,
  reservationUrl: URL_MAX_LEN,
  onlineOrderUrl: URL_MAX_LEN,
  menuUrl: URL_MAX_LEN,
  googleMapsUrl: URL_MAX_LEN,
} as const

export type BriefHintsState = {
  // Single free-text area for additional location details.
  notes: string
  // Profile, contact, and link fields that should remain editable.
  instagramHandle: string
  websiteUrl: string
  reservationUrl: string
  onlineOrderUrl: string
  menuUrl: string
  googleMapsUrl: string
  phone: string
  contactEmail: string
  neighborhood: string
}

export function defaultBriefHintsState(): BriefHintsState {
  return {
    notes: '',
    instagramHandle: '',
    websiteUrl: '',
    reservationUrl: '',
    onlineOrderUrl: '',
    menuUrl: '',
    googleMapsUrl: '',
    phone: '',
    contactEmail: '',
    neighborhood: '',
  }
}

function parseString(raw: unknown): string {
  return typeof raw === 'string' ? raw : ''
}

export function briefHintsFromQuickProfile(raw: unknown): BriefHintsState {
  const base = defaultBriefHintsState()
  if (!raw || typeof raw !== 'object') return base
  const o = raw as Record<string, unknown>

  if (typeof o.notes === 'string') {
    base.notes = o.notes
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

  return base
}

export function buildQuickProfilePayload(state: BriefHintsState): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  if (state.notes.trim()) out.notes = state.notes.trim()

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
  ] as const) {
    const value = state[key].trim()
    if (value) out[key] = value
  }

  return out
}

export function briefHintsHasAnySelection(state: BriefHintsState): boolean {
  if (state.notes.trim()) {
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
  ]
  return textFields.some((key) => {
    const value = state[key]
    return typeof value === 'string' && value.trim().length > 0
  })
}
