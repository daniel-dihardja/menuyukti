/** Shared types and helpers for the Nearby Locations playbook. */

export const NEARBY_FOCUS_IDS = ['lunch_demand', 'competitors', 'schools', 'hotels'] as const

export type NearbyFocusId = (typeof NEARBY_FOCUS_IDS)[number]

export const NEARBY_NODE_KINDS = ['demand', 'competitor', 'landmark', 'origin'] as const

export type NearbyNodeKind = (typeof NEARBY_NODE_KINDS)[number]

export type NearbyScanNode = {
  id: string
  kind: NearbyNodeKind
  name: string
  placeId: string | null
  lat: number
  lng: number
  types: string[]
  rating: number | null
  address: string | null
  distanceMeters: number | null
  signals: string[]
  marketingHook: string | null
  sources: string[]
}

export type NearbyScanResult = {
  origin: NearbyScanNode
  nodes: NearbyScanNode[]
  progress?: string | null
}

export type NearbyScanConfig = {
  address: string
  instructions: string
  focus: NearbyFocusId[]
}

export type NearbyLocationBranch = {
  id: number
  name: string
  street: string | null
  city: string | null
  country: string | null
}

export function formatLocationAddress(branch: {
  street: string | null
  city: string | null
  country: string | null
}): string {
  return [branch.street, branch.city, branch.country]
    .map((part) => (typeof part === 'string' ? part.trim() : ''))
    .filter(Boolean)
    .join(', ')
}

export function isNearbyFocusId(value: string): value is NearbyFocusId {
  return (NEARBY_FOCUS_IDS as readonly string[]).includes(value)
}

const SESSION_PREFIX = 'nearby-playbook-config:'

export function stashNearbyScanConfig(playbookId: number, config: NearbyScanConfig): void {
  try {
    sessionStorage.setItem(`${SESSION_PREFIX}${playbookId}`, JSON.stringify(config))
  } catch {
    // ignore quota / private mode
  }
}

export function loadNearbyScanConfig(playbookId: number): NearbyScanConfig | null {
  try {
    const raw = sessionStorage.getItem(`${SESSION_PREFIX}${playbookId}`)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<NearbyScanConfig>
    if (typeof parsed.address !== 'string') return null
    const focus = Array.isArray(parsed.focus)
      ? parsed.focus.filter((f): f is NearbyFocusId => typeof f === 'string' && isNearbyFocusId(f))
      : []
    return {
      address: parsed.address,
      instructions: typeof parsed.instructions === 'string' ? parsed.instructions : '',
      focus,
    }
  } catch {
    return null
  }
}

export function todayIsoDate(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function googleMapsPlaceUrl(node: NearbyScanNode): string {
  if (node.placeId) {
    return `https://www.google.com/maps/search/?api=1&query_place_id=${encodeURIComponent(node.placeId)}`
  }
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${node.lat},${node.lng}`)}`
}
