/**
 * Restaurant client sidebar order: AI Analytics → Locations → Guests → Playbooks → AI usage.
 * Unexpected keys keep relative order after these.
 */
export const CLIENT_NAV_ORDER = ['chat', 'home', 'services', 'playbooks', 'usage'] as const

/** Keys paired first: AI Analytics + Locations. */
export const CLIENT_ANALYTICS_NAV_KEYS = new Set<string>(['chat', 'home'])

/** Keys paired next: Guests + Playbooks. */
export const CLIENT_GUESTS_NAV_KEYS = new Set<string>(['services', 'playbooks'])

/** Keys rendered after Guests/Playbooks (AI usage metering). */
export const CLIENT_USAGE_NAV_KEYS = new Set<string>(['usage'])

/** @deprecated Use {@link CLIENT_ANALYTICS_NAV_KEYS}. */
export const CLIENT_AI_NAV_KEYS = CLIENT_ANALYTICS_NAV_KEYS

type FlatNavItem = { key: string }

const NAV_RANK = new Map<string, number>(CLIENT_NAV_ORDER.map((key, index) => [key, index]))

/**
 * Sort client sidebar into AI Analytics → Locations → Guests → Playbooks → AI usage.
 * Other keys keep their relative input order after those.
 */
export function orderClientFlatNav<T extends FlatNavItem>(items: readonly T[]): T[] {
  const ranked: T[] = []
  const other: T[] = []
  for (const item of items) {
    if (NAV_RANK.has(item.key)) ranked.push(item)
    else other.push(item)
  }
  ranked.sort((a, b) => (NAV_RANK.get(a.key) ?? 0) - (NAV_RANK.get(b.key) ?? 0))
  return [...ranked, ...other]
}

/**
 * Split ordered client nav into analytics (AI + Locations), guests (Guests + Playbooks),
 * and usage groups (separators between each section).
 */
export function splitClientNavAtAi<T extends FlatNavItem>(
  items: readonly T[],
): { primary: T[]; guests: T[]; usage: T[] } {
  const primary: T[] = []
  const guests: T[] = []
  const usage: T[] = []
  for (const item of items) {
    if (CLIENT_ANALYTICS_NAV_KEYS.has(item.key)) primary.push(item)
    else if (CLIENT_GUESTS_NAV_KEYS.has(item.key)) guests.push(item)
    else if (CLIENT_USAGE_NAV_KEYS.has(item.key)) usage.push(item)
    else primary.push(item)
  }
  return { primary, guests, usage }
}

/**
 * @deprecated Prefer {@link orderClientFlatNav}. Kept for tests during transition.
 */
export function partitionClientNav<T extends FlatNavItem>(
  items: readonly T[],
): {
  core: T[]
  services: T[]
  other: T[]
} {
  const ordered = orderClientFlatNav(items)
  const core: T[] = []
  const services: T[] = []
  const other: T[] = []
  for (const item of ordered) {
    if (item.key === 'home') core.push(item)
    else if (item.key === 'services') services.push(item)
    else other.push(item)
  }
  return { core, services, other }
}
