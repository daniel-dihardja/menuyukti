import { describe, expect, it } from 'vitest'

import {
  computeColumnTotals,
  computeRowTotal,
  computeScaleBounds,
  findPeakColumnIndex,
  findTopRowByTotal,
  type HeatmapInsightRow,
} from '@/lib/analytics/heatmap-insights'

const sampleRows: HeatmapInsightRow[] = [
  { key: 'a', label: 'Burger', values: [2, 1, 1] },
  { key: 'b', label: 'Fries', values: [0, 3, 4] },
]

describe('computeRowTotal', () => {
  it('sums all values in a row', () => {
    expect(computeRowTotal(sampleRows[0]!)).toBe(4)
    expect(computeRowTotal(sampleRows[1]!)).toBe(7)
  })
})

describe('computeColumnTotals', () => {
  it('sums values per column', () => {
    expect(computeColumnTotals(sampleRows)).toEqual([2, 4, 5])
  })

  it('returns empty array for no rows', () => {
    expect(computeColumnTotals([])).toEqual([])
  })
})

describe('findPeakColumnIndex', () => {
  it('returns index of highest total', () => {
    expect(findPeakColumnIndex([2, 4, 5])).toBe(2)
  })

  it('returns null when all totals are zero', () => {
    expect(findPeakColumnIndex([0, 0, 0])).toBeNull()
  })

  it('returns null for empty totals', () => {
    expect(findPeakColumnIndex([])).toBeNull()
  })
})

describe('findTopRowByTotal', () => {
  it('returns row with highest sum', () => {
    expect(findTopRowByTotal(sampleRows)?.key).toBe('b')
  })

  it('returns null when all rows sum to zero', () => {
    expect(
      findTopRowByTotal([
        { key: 'a', label: 'A', values: [0, 0] },
        { key: 'b', label: 'B', values: [0, 0] },
      ]),
    ).toBeNull()
  })

  it('returns null for empty rows', () => {
    expect(findTopRowByTotal([])).toBeNull()
  })
})

describe('computeScaleBounds', () => {
  it('returns min and max across all cell values', () => {
    expect(computeScaleBounds(sampleRows)).toEqual({ min: 0, max: 4 })
  })

  it('returns zeros for empty rows', () => {
    expect(computeScaleBounds([])).toEqual({ min: 0, max: 0 })
  })

  it('handles single row', () => {
    expect(computeScaleBounds([{ key: 'a', label: 'A', values: [3, 3] }])).toEqual({
      min: 3,
      max: 3,
    })
  })
})
