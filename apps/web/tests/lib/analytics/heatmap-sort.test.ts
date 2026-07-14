import { describe, expect, it } from 'vitest'

import type { HeatmapInsightRow } from '@/lib/analytics/heatmap-insights'
import { getNextHeatmapSortState, sortHeatmapRows } from '@/lib/analytics/heatmap-sort'

const sampleRows: HeatmapInsightRow[] = [
  { key: 'a', label: 'Burger', values: [2, 1, 1] },
  { key: 'b', label: 'Fries', values: [0, 3, 4] },
  { key: 'c', label: 'Salad', values: [1, 0, 0] },
]

describe('sortHeatmapRows', () => {
  it('sorts by column index descending', () => {
    const sorted = sortHeatmapRows(sampleRows, '2', 'desc')
    expect(sorted.map((row) => row.key)).toEqual(['b', 'a', 'c'])
  })

  it('sorts by column index ascending', () => {
    const sorted = sortHeatmapRows(sampleRows, '2', 'asc')
    expect(sorted.map((row) => row.key)).toEqual(['c', 'a', 'b'])
  })

  it('sorts by row total descending', () => {
    const sorted = sortHeatmapRows(sampleRows, 'total', 'desc')
    expect(sorted.map((row) => row.key)).toEqual(['b', 'a', 'c'])
  })

  it('sorts by row total ascending', () => {
    const sorted = sortHeatmapRows(sampleRows, 'total', 'asc')
    expect(sorted.map((row) => row.key)).toEqual(['c', 'a', 'b'])
  })

  it('sorts by label alphabetically', () => {
    const sorted = sortHeatmapRows(sampleRows, 'label', 'asc')
    expect(sorted.map((row) => row.label)).toEqual(['Burger', 'Fries', 'Salad'])
  })
})

describe('getNextHeatmapSortState', () => {
  it('cycles data column: desc → asc → total', () => {
    expect(getNextHeatmapSortState({ sortKey: '1', sortDirection: 'desc' }, '1')).toEqual({
      sortKey: '1',
      sortDirection: 'asc',
    })
    expect(getNextHeatmapSortState({ sortKey: '1', sortDirection: 'asc' }, '1')).toEqual({
      sortKey: 'total',
      sortDirection: 'desc',
    })
  })

  it('selects a new data column with desc', () => {
    expect(getNextHeatmapSortState({ sortKey: 'total', sortDirection: 'desc' }, '0')).toEqual({
      sortKey: '0',
      sortDirection: 'desc',
    })
  })

  it('toggles label sort direction when label is already active', () => {
    expect(getNextHeatmapSortState({ sortKey: 'label', sortDirection: 'desc' }, 'label')).toEqual({
      sortKey: 'label',
      sortDirection: 'asc',
    })
  })
})
