/** Included workspace nav for restaurant clients (locations, stock, people). */
export const CLIENT_CORE_ORDER = ['branches', 'inventar', 'team'] as const

/** Paid cloud services nav for restaurant clients. */
export const CLIENT_SERVICES_ORDER = ['services'] as const

/** @deprecated Prefer {@link CLIENT_CORE_ORDER} + {@link CLIENT_SERVICES_ORDER}. */
export const CLIENT_FLAT_ORDER = [...CLIENT_CORE_ORDER, ...CLIENT_SERVICES_ORDER] as const

type FlatNavItem = { key: string }

const CORE_RANK = new Map<string, number>(CLIENT_CORE_ORDER.map((key, index) => [key, index]))
const SERVICES_RANK = new Map<string, number>(
  CLIENT_SERVICES_ORDER.map((key, index) => [key, index]),
)

function sortByRank<T extends FlatNavItem>(
  items: readonly T[],
  rank: ReadonlyMap<string, number>,
): T[] {
  return [...items].sort((a, b) => {
    const rankA = rank.get(a.key)
    const rankB = rank.get(b.key)
    if (rankA != null && rankB != null) return rankA - rankB
    if (rankA != null) return -1
    if (rankB != null) return 1
    return 0
  })
}

/**
 * Split client sidebar into core workspace vs paid Services, preserving relative
 * order for any unexpected leftover keys after Services.
 */
export function partitionClientNav<T extends FlatNavItem>(
  items: readonly T[],
): {
  core: T[]
  services: T[]
  other: T[]
} {
  const core: T[] = []
  const services: T[] = []
  const other: T[] = []
  for (const item of items) {
    if (CORE_RANK.has(item.key)) core.push(item)
    else if (SERVICES_RANK.has(item.key)) services.push(item)
    else other.push(item)
  }
  return {
    core: sortByRank(core, CORE_RANK),
    services: sortByRank(services, SERVICES_RANK),
    other,
  }
}

/**
 * Sort client sidebar items into Locations → Inventory → Team → Services.
 * Other keys keep their relative input order after those.
 */
export function orderClientFlatNav<T extends FlatNavItem>(items: readonly T[]): T[] {
  const { core, services, other } = partitionClientNav(items)
  return [...core, ...services, ...other]
}
