import type { HeatmapMatrixRow } from '@/app/(protected)/analytics/[analyticsId]/heatmap/heatmap-matrix'
import type { MenuComboPair, MenuCombosData } from '@/lib/graphql/queries/analytics'

export type MenuCombosPayload = NonNullable<MenuCombosData['menuCombos']>

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
