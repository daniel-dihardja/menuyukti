/** Job order for restaurant clients: venues → stock → people. */
export const CLIENT_FLAT_ORDER = ['branches', 'inventar', 'team'] as const

type FlatNavItem = { key: string }

/**
 * Sort client sidebar items into Locations → Inventory → Team.
 * Other keys keep their relative input order after those three.
 */
export function orderClientFlatNav<T extends FlatNavItem>(items: readonly T[]): T[] {
  const rank = new Map<string, number>(CLIENT_FLAT_ORDER.map((key, index) => [key, index]))
  return [...items].sort((a, b) => {
    const rankA = rank.get(a.key)
    const rankB = rank.get(b.key)
    if (rankA != null && rankB != null) return rankA - rankB
    if (rankA != null) return -1
    if (rankB != null) return 1
    return 0
  })
}
