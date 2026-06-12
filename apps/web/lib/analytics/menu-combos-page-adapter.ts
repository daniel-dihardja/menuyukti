import type { HeatmapMatrixRow } from '@/app/(protected)/analytics/[analyticsId]/heatmap/heatmap-matrix'
import type { MenuComboPair, MenuCombosData } from '@/lib/graphql/queries/analytics'
export type MenuCombosPayload = NonNullable<MenuCombosData['menuCombos']>

export type MinLiftFilter = 'all' | 'above1' | 'above1_5'

export type MenuCombosPairFilters = {
  menuCategory: string
  minLift: MinLiftFilter
}

export type BundleIdeaGroup = {
  kind: 'premium' | 'upsell'
  pairs: MenuComboPair[]
}

export const STRONG_LIFT_THRESHOLD = 1.5
export const WEAK_LIFT_THRESHOLD = 1

export function multiItemOrderShare(payload: MenuCombosPayload): number {
  if (payload.totalOrders === 0) return 0
  return payload.multiItemOrderCount / payload.totalOrders
}

export function buildLiftMatrixRows(
  focusMenus: string[],
  matrixLift: Array<Array<number | null>>,
): HeatmapMatrixRow[] {
  return focusMenus.map((menu, rowIndex) => ({
    key: menu,
    label: menu,
    values: focusMenus.map((_, colIndex) => {
      const value = matrixLift[rowIndex]?.[colIndex]
      return value ?? 0
    }),
  }))
}

export function isMatrixDiagonalCell(rowIndex: number, colIndex: number): boolean {
  return rowIndex === colIndex
}

export function formatLift(value: number, locale: string): string {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(value)
}

export function formatPercent(value: number, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: 'percent',
    maximumFractionDigits: 1,
  }).format(value)
}

export function pairLabel(pair: MenuComboPair): string {
  return `${pair.menuA} + ${pair.menuB}`
}

export function sortPairsByLift(pairs: MenuComboPair[]): MenuComboPair[] {
  return [...pairs].sort((a, b) => {
    if (b.lift !== a.lift) return b.lift - a.lift
    if (b.coOrderCount !== a.coOrderCount) return b.coOrderCount - a.coOrderCount
    return pairLabel(a).localeCompare(pairLabel(b))
  })
}

export type PairSortKey = 'coOrderCount' | 'lift' | 'support'

export function sortPairs(
  pairs: MenuComboPair[],
  sortKey: PairSortKey,
  direction: 'asc' | 'desc',
): MenuComboPair[] {
  const factor = direction === 'asc' ? 1 : -1
  return [...pairs].sort((a, b) => {
    const aVal = a[sortKey]
    const bVal = b[sortKey]
    if (aVal !== bVal) return (aVal - bVal) * factor
    if (b.coOrderCount !== a.coOrderCount) return (b.coOrderCount - a.coOrderCount) * factor
    return pairLabel(a).localeCompare(pairLabel(b))
  })
}

export function getTopComboPair(pairs: MenuComboPair[]): MenuComboPair | null {
  const sorted = sortPairsByLift(pairs)
  return sorted[0] ?? null
}

export function getMenuCategoryOptions(pairs: MenuComboPair[], locale: string): string[] {
  const categories = new Set<string>()
  for (const pair of pairs) {
    const a = pair.menuACategory?.trim()
    const b = pair.menuBCategory?.trim()
    if (a) categories.add(a)
    if (b) categories.add(b)
  }
  return [...categories].sort((a, b) => a.localeCompare(b, locale))
}

function passesMinLift(pair: MenuComboPair, minLift: MinLiftFilter): boolean {
  if (minLift === 'all') return true
  if (minLift === 'above1') return pair.lift >= WEAK_LIFT_THRESHOLD
  return pair.lift >= STRONG_LIFT_THRESHOLD
}

function passesMenuCategoryFilter(pair: MenuComboPair, menuCategory: string): boolean {
  if (menuCategory === 'all') return true
  return pair.menuACategory === menuCategory || pair.menuBCategory === menuCategory
}

export function filterPairs(
  pairs: MenuComboPair[],
  filters: MenuCombosPairFilters,
): MenuComboPair[] {
  return pairs.filter(
    (pair) =>
      passesMinLift(pair, filters.minLift) && passesMenuCategoryFilter(pair, filters.menuCategory),
  )
}

export function groupBundleIdeas(pairs: MenuComboPair[]): BundleIdeaGroup[] {
  const sorted = sortPairsByLift(pairs)
  const premium = sorted
    .filter((pair) => pair.matrixCategoryA === 'star' && pair.matrixCategoryB === 'star')
    .slice(0, 3)
  const upsell = sorted
    .filter((pair) => {
      const cats = [pair.matrixCategoryA, pair.matrixCategoryB]
      const hasStar = cats.includes('star')
      const hasPuzzle = cats.includes('puzzle')
      return hasStar && hasPuzzle
    })
    .slice(0, 3)

  const groups: BundleIdeaGroup[] = []
  if (premium.length > 0) groups.push({ kind: 'premium', pairs: premium })
  if (upsell.length > 0) groups.push({ kind: 'upsell', pairs: upsell })
  return groups
}

export function liftStrengthClass(lift: number): string | null {
  if (lift >= STRONG_LIFT_THRESHOLD) return 'bg-primary/5'
  if (lift < WEAK_LIFT_THRESHOLD) return 'bg-muted/30'
  return null
}
