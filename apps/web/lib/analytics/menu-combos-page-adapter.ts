import type { HeatmapMatrixRow } from '@/app/(protected)/analytics/[analyticsId]/heatmap/heatmap-matrix'
import type {
  ComboPairTimingCell,
  MenuComboPair,
  MenuComboPairTiming,
  MenuCombosData,
  PromoPosture,
  RelativeDemand,
  SlotDemandCell,
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

export type ComboPairPeakSummary = {
  peakDay: string | null
  peakMealPeriodLabel: string | null
  peakMealPeriodHoursLabel: string | null
  peakHour: number | null
  peakSlotCoOrders: number
  peakHourCoOrders: number
}

const EMPTY_PEAK_SUMMARY: ComboPairPeakSummary = {
  peakDay: null,
  peakMealPeriodLabel: null,
  peakMealPeriodHoursLabel: null,
  peakHour: null,
  peakSlotCoOrders: 0,
  peakHourCoOrders: 0,
}

export function deriveComboPairPeakSummary(timing: MenuComboPairTiming): ComboPairPeakSummary {
  const activeCells = timing.dayMealCells.filter((cell) => cell.coOrderCount > 0)
  const activeHours = timing.hourlyCoOrders.filter((row) => row.coOrderCount > 0)

  if (activeCells.length === 0 && activeHours.length === 0) {
    return EMPTY_PEAK_SUMMARY
  }

  let bestCell: ComboPairTimingCell | null = null
  for (const cell of activeCells) {
    if (!bestCell) {
      bestCell = cell
      continue
    }
    const indexDiff = cell.coOrderIndex - bestCell.coOrderIndex
    if (indexDiff > 0) {
      bestCell = cell
      continue
    }
    if (indexDiff === 0 && cell.coOrderCount > bestCell.coOrderCount) {
      bestCell = cell
      continue
    }
    if (
      indexDiff === 0 &&
      cell.coOrderCount === bestCell.coOrderCount &&
      COMBO_WEEKDAYS.indexOf(cell.day as ComboWeekday) <
        COMBO_WEEKDAYS.indexOf(bestCell.day as ComboWeekday)
    ) {
      bestCell = cell
    }
  }

  let bestHour: { hour: number; coOrderCount: number } | null = null
  for (const row of activeHours) {
    if (!bestHour) {
      bestHour = row
      continue
    }
    if (row.coOrderCount > bestHour.coOrderCount) {
      bestHour = row
      continue
    }
    if (row.coOrderCount === bestHour.coOrderCount && row.hour < bestHour.hour) {
      bestHour = row
    }
  }

  return {
    peakDay: bestCell?.day ?? null,
    peakMealPeriodLabel: bestCell?.mealPeriodLabel ?? null,
    peakMealPeriodHoursLabel: bestCell?.mealPeriodHoursLabel ?? null,
    peakHour: bestHour?.hour ?? null,
    peakSlotCoOrders: bestCell?.coOrderCount ?? 0,
    peakHourCoOrders: bestHour?.coOrderCount ?? 0,
  }
}

export function hasActionableTiming(timing: MenuComboPairTiming): boolean {
  return (
    timing.dayMealCells.some((cell) => cell.coOrderCount > 0) ||
    timing.recommendedWindow.bestDay != null
  )
}

export function findPairForTiming(
  pairs: MenuComboPair[],
  timing: MenuComboPairTiming,
): MenuComboPair | null {
  return pairs.find((pair) => pair.menuA === timing.menuA && pair.menuB === timing.menuB) ?? null
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

export const SLOT_INDEX_GAUGE_MIN = 0.5
export const SLOT_INDEX_GAUGE_MAX = 1.5

export type OpportunityCell = {
  day: ComboWeekday
  mealPeriod: ComboMealPeriod
  mealPeriodLabel: string
  mealPeriodHoursLabel: string
  pairCoOrderIndex: number
  venueDemandIndex: number
  venueRelativeDemand: RelativeDemand
  /** Marketing posture applies only at the pair peak slot. */
  promoPosture: PromoPosture | null
  isPeak: boolean
  coOrderCount: number
}

export type PeakSlotHighlight = {
  rowKey: string
  columnIndex: number
}

export function postureBadgeVariant(
  posture: PromoPosture,
): 'default' | 'secondary' | 'outline' | 'destructive' {
  switch (posture) {
    case 'support':
      return 'default'
    case 'promote':
      return 'secondary'
    case 'maintain':
      return 'outline'
    default:
      return 'outline'
  }
}

export function postureBadgeClassName(posture: PromoPosture): string {
  switch (posture) {
    case 'support':
      return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
    case 'promote':
      return 'border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300'
    case 'maintain':
      return 'border-border bg-muted/50 text-muted-foreground'
    default:
      return 'border-border bg-muted/30 text-muted-foreground'
  }
}

export function buildOpportunityCells(
  timing: MenuComboPairTiming,
  slotProfile: SlotDemandCell[],
): OpportunityCell[] {
  const venueByKey = new Map(slotProfile.map((cell) => [`${cell.day}:${cell.mealPeriod}`, cell]))
  const pairByKey = new Map(
    timing.dayMealCells.map((cell) => [`${cell.day}:${cell.mealPeriod}`, cell]),
  )

  const peakDay = timing.recommendedWindow.bestDay
  const peakPeriod = timing.recommendedWindow.bestMealPeriod
  const peakPosture = timing.promoPosture?.promoPosture

  const cells: OpportunityCell[] = []

  for (const day of COMBO_WEEKDAYS) {
    for (const mealPeriod of COMBO_MEAL_PERIODS) {
      const key = `${day}:${mealPeriod}`
      const venue = venueByKey.get(key)
      const pair = pairByKey.get(key)
      const isPeak = day === peakDay && mealPeriod === peakPeriod

      cells.push({
        day,
        mealPeriod,
        mealPeriodLabel: pair?.mealPeriodLabel ?? venue?.mealPeriodLabel ?? mealPeriod,
        mealPeriodHoursLabel: pair?.mealPeriodHoursLabel ?? venue?.mealPeriodHoursLabel ?? '',
        pairCoOrderIndex: pair?.coOrderIndex ?? 0,
        venueDemandIndex: venue?.demandIndex ?? 0,
        venueRelativeDemand: venue?.relativeDemand ?? 'average',
        promoPosture: isPeak && peakPosture ? peakPosture : null,
        isPeak,
        coOrderCount: pair?.coOrderCount ?? 0,
      })
    }
  }

  return cells
}

export function getOpportunityCellsForDay(
  cells: OpportunityCell[],
  day: ComboWeekday,
): OpportunityCell[] {
  return COMBO_MEAL_PERIODS.map(
    (period) => cells.find((cell) => cell.day === day && cell.mealPeriod === period)!,
  )
}

export function adaptSlotDemandHeatmap(slotProfile: SlotDemandCell[]): {
  rows: HeatmapMatrixRow[]
  columnLabels: string[]
} {
  const cellByKey = new Map(slotProfile.map((cell) => [`${cell.day}:${cell.mealPeriod}`, cell]))

  const columnLabels = COMBO_WEEKDAYS.map((day) => day.toUpperCase())

  const rows: HeatmapMatrixRow[] = COMBO_MEAL_PERIODS.map((period) => {
    const sampleCell = slotProfile.find((cell) => cell.mealPeriod === period)
    return {
      key: period,
      label: sampleCell
        ? formatMealPeriodWithHours(sampleCell.mealPeriodLabel, sampleCell.mealPeriodHoursLabel)
        : period,
      values: COMBO_WEEKDAYS.map((day) => {
        const cell = cellByKey.get(`${day}:${period}`)
        return cell?.demandIndex ?? 0
      }),
    }
  })

  return { rows, columnLabels }
}

export function getPeakSlotHighlight(timing: MenuComboPairTiming): PeakSlotHighlight | null {
  const day = timing.recommendedWindow.bestDay
  const period = timing.recommendedWindow.bestMealPeriod
  if (!day || !period) return null

  const columnIndex = COMBO_WEEKDAYS.indexOf(day as ComboWeekday)
  if (columnIndex < 0) return null

  return { rowKey: period, columnIndex }
}
