import { useCallback, useState } from 'react'

import type { SortDirection } from '@/components/sortable-table'
import { computeRowTotal, type HeatmapInsightRow } from '@/lib/analytics/heatmap-insights'

/** Sort by menu label, row total, or column index (e.g. "0", "1"). */
export type HeatmapSortKey = 'label' | 'total' | string

export type HeatmapSortState = {
  sortKey: HeatmapSortKey
  sortDirection: SortDirection
}

export function sortHeatmapRows(
  rows: HeatmapInsightRow[],
  sortKey: HeatmapSortKey,
  sortDirection: SortDirection,
  rowKeyOrder?: readonly string[],
): HeatmapInsightRow[] {
  if (sortKey === 'label') {
    return [...rows].sort((a, b) => {
      let cmp: number
      if (rowKeyOrder) {
        const aIndex = rowKeyOrder.indexOf(a.key)
        const bIndex = rowKeyOrder.indexOf(b.key)
        const aRank = aIndex >= 0 ? aIndex : rowKeyOrder.length
        const bRank = bIndex >= 0 ? bIndex : rowKeyOrder.length
        cmp = aRank - bRank
      } else {
        cmp = a.label.localeCompare(b.label)
      }
      return sortDirection === 'asc' ? cmp : -cmp
    })
  }

  if (sortKey === 'total') {
    return [...rows].sort((a, b) => {
      const aVal = computeRowTotal(a)
      const bVal = computeRowTotal(b)
      return sortDirection === 'asc' ? aVal - bVal : bVal - aVal
    })
  }

  const columnIndex = parseInt(sortKey, 10)
  if (Number.isNaN(columnIndex)) return rows

  return [...rows].sort((a, b) => {
    const aVal = a.values[columnIndex] ?? 0
    const bVal = b.values[columnIndex] ?? 0
    return sortDirection === 'asc' ? aVal - bVal : bVal - aVal
  })
}

export function getNextHeatmapSortState(
  current: HeatmapSortState,
  nextKey: HeatmapSortKey,
): HeatmapSortState {
  if (nextKey === 'label') {
    if (current.sortKey === 'label') {
      return {
        sortKey: 'label',
        sortDirection: current.sortDirection === 'asc' ? 'desc' : 'asc',
      }
    }
    return { sortKey: 'label', sortDirection: 'desc' }
  }

  if (current.sortKey === nextKey) {
    if (current.sortDirection === 'desc') {
      return { sortKey: nextKey, sortDirection: 'asc' }
    }
    return { sortKey: 'total', sortDirection: 'desc' }
  }

  return { sortKey: nextKey, sortDirection: 'desc' }
}

export function useHeatmapSort(
  initialSortKey: HeatmapSortKey,
  initialDirection: SortDirection = 'desc',
) {
  const [sortState, setSortState] = useState<HeatmapSortState>({
    sortKey: initialSortKey,
    sortDirection: initialDirection,
  })

  const toggleSort = useCallback((nextKey: HeatmapSortKey) => {
    setSortState((current) => getNextHeatmapSortState(current, nextKey))
  }, [])

  return {
    sortKey: sortState.sortKey,
    sortDirection: sortState.sortDirection,
    toggleSort,
  }
}
