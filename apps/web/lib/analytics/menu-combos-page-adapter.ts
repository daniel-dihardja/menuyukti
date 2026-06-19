import type { HeatmapMatrixRow } from '@/app/(protected)/analytics/[analyticsId]/heatmap/heatmap-matrix'
import { DAILY_HEATMAP_END_HOUR, DAILY_HEATMAP_START_HOUR } from '@/lib/heatmap-config'
import type {
  ComboPairTimingCell,
  MenuComboPair,
  MenuComboPairTiming,
  MenuCombosData,
} from '@/lib/graphql/queries/analytics'
export type MenuCombosPayload = NonNullable<MenuCombosData['menuCombos']>

export const COMBO_MEAL_PERIODS = [
  'breakfast',
  'lunch',
  'afternoon',
  'dinner',
  'late_night',
] as const

export const COMBO_WEEKDAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const

export type ComboMealPeriod = (typeof COMBO_MEAL_PERIODS)[number]
export type ComboWeekday = (typeof COMBO_WEEKDAYS)[number]

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

export function pairLabel(pair: Pick<MenuComboPair, 'menuA' | 'menuB'>): string {
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

export function getTopPairsForTiming(pairs: MenuComboPair[], n = 3): MenuComboPair[] {
  return sortPairsByLift(pairs).slice(0, n)
}

export function formatMealPeriodWithHours(
  label: string | null | undefined,
  hoursLabel: string | null | undefined,
): string {
  const short = label?.trim()
  const hours = hoursLabel?.trim()
  if (short && hours) return `${short} (${hours})`
  if (short) return short
  if (hours) return hours
  return '—'
}

export function adaptComboDayMealHeatmap(cells: ComboPairTimingCell[]): {
  rows: HeatmapMatrixRow[]
  columnLabels: string[]
} {
  const cellByKey = new Map(cells.map((cell) => [`${cell.day}:${cell.mealPeriod}`, cell]))

  const columnLabels = COMBO_WEEKDAYS.map((day) => day.toUpperCase())

  const rows: HeatmapMatrixRow[] = COMBO_MEAL_PERIODS.map((period) => {
    const sampleCell = cells.find((cell) => cell.mealPeriod === period)
    return {
      key: period,
      label: sampleCell
        ? formatMealPeriodWithHours(sampleCell.mealPeriodLabel, sampleCell.mealPeriodHoursLabel)
        : period,
      values: COMBO_WEEKDAYS.map((day) => {
        const cell = cellByKey.get(`${day}:${period}`)
        return cell?.coOrderIndex ?? 0
      }),
    }
  })

  return { rows, columnLabels }
}

export function adaptComboHourlyHeatmap(
  hourlyCoOrders: Array<{ hour: number; coOrderCount: number }>,
  pairLabel: string,
): { rows: HeatmapMatrixRow[]; columnLabels: string[] } {
  const byHour = new Map(hourlyCoOrders.map((row) => [row.hour, row.coOrderCount]))
  const hours = Array.from(
    { length: DAILY_HEATMAP_END_HOUR - DAILY_HEATMAP_START_HOUR + 1 },
    (_, index) => DAILY_HEATMAP_START_HOUR + index,
  )

  return {
    rows: [
      {
        key: pairLabel,
        label: pairLabel,
        values: hours.map((hour) => byHour.get(hour) ?? 0),
      },
    ],
    columnLabels: hours.map((hour) => String(hour).padStart(2, '0')),
  }
}

export function hasActionableTiming(timing: MenuComboPairTiming): boolean {
  return timing.recommendedWindow.confidenceTier !== 'insufficient'
}

export function findTimingForPair(
  topPairTiming: MenuComboPairTiming[],
  pair: MenuComboPair,
): MenuComboPairTiming | null {
  return (
    topPairTiming.find((timing) => timing.menuA === pair.menuA && timing.menuB === pair.menuB) ??
    null
  )
}

export function formatRecommendedWindowShort(
  timing: MenuComboPairTiming,
  weekdayLabel: (day: string) => string,
): string | null {
  const window = timing.recommendedWindow
  if (!window.bestDay || !window.bestMealPeriodLabel) return null
  const mealPeriod = formatMealPeriodWithHours(
    window.bestMealPeriodLabel,
    window.bestMealPeriodHoursLabel,
  )
  return `${weekdayLabel(window.bestDay)} · ${mealPeriod}`
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
