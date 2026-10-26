/**
 * Restaurant client sidebar order: locations, guest experience, then AI tools.
 * Unexpected keys keep relative order after these.
 */
export const CLIENT_NAV_ORDER = ['home', 'services', 'chat', 'playbooks', 'usage'] as const

/** Keys rendered in the AI tools section (after the first separator). */
export const CLIENT_AI_NAV_KEYS = new Set<string>(['chat', 'playbooks'])

/** Keys rendered after Playbooks (second separator) — account / metering. */
export const CLIENT_USAGE_NAV_KEYS = new Set<string>(['usage'])

type FlatNavItem = { key: string }

const NAV_RANK = new Map<string, number>(CLIENT_NAV_ORDER.map((key, index) => [key, index]))

/**
 * Sort client sidebar into Locations → Guest experience → AI → Playbooks → AI usage.
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
 * Split ordered client nav into primary, AI tools, and AI usage groups
 * (separators between primary → AI and Playbooks → usage).
 */
export function splitClientNavAtAi<T extends FlatNavItem>(
  items: readonly T[],
): { primary: T[]; ai: T[]; usage: T[] } {
  const primary: T[] = []
  const ai: T[] = []
  const usage: T[] = []
  for (const item of items) {
    if (CLIENT_AI_NAV_KEYS.has(item.key)) ai.push(item)
    else if (CLIENT_USAGE_NAV_KEYS.has(item.key)) usage.push(item)
    else primary.push(item)
  }
  return { primary, ai, usage }
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
