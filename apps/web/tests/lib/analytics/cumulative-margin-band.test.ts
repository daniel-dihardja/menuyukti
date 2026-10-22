import { describe, expect, it } from 'vitest'

import { buildCumulativeMarginBand } from '@/lib/analytics/cumulative-margin-band'

const rows = [
  { menuItem: 'A', contributionMarginShare: 0.01, contributionMargin: 10 },
  { menuItem: 'B', contributionMarginShare: 0.02, contributionMargin: 20 },
  { menuItem: 'C', contributionMarginShare: 0.005, contributionMargin: 5 },
  { menuItem: 'D', contributionMarginShare: 0.03, contributionMargin: 30 },
]

describe('buildCumulativeMarginBand', () => {
  it('returns empty band when threshold is zero or negative', () => {
    expect(buildCumulativeMarginBand(rows, 0).itemCount).toBe(0)
    expect(buildCumulativeMarginBand(rows, -1).selected).toEqual([])
  })

  it('selects weakest items until cumulative share exceeds threshold', () => {
    // 0.5% → only C (0.5%)
    const half = buildCumulativeMarginBand(rows, 0.5)
    expect(half.selected.map((r) => r.menuItem)).toEqual(['C'])
    expect(half.marginShare).toBeCloseTo(0.005)
    expect(half.marginAmount).toBe(5)

    // 1.5% → C (0.5%) + A (1%) = 1.5%
    const oneFive = buildCumulativeMarginBand(rows, 1.5)
    expect(oneFive.selected.map((r) => r.menuItem)).toEqual(['C', 'A'])
    expect(oneFive.itemCount).toBe(2)
    expect(oneFive.marginShare).toBeCloseTo(0.015)
    expect(oneFive.marginAmount).toBe(15)
  })

  it('stops before adding an item that would exceed the threshold', () => {
    // 0.7% → only C; A (1%) would push past 0.7%
    const band = buildCumulativeMarginBand(rows, 0.7)
    expect(band.selected.map((r) => r.menuItem)).toEqual(['C'])
  })

  it('tie-breaks equal shares by menu name', () => {
    const tied = [
      { menuItem: 'Zed', contributionMarginShare: 0.01, contributionMargin: 1 },
      { menuItem: 'Alpha', contributionMarginShare: 0.01, contributionMargin: 1 },
    ]
    const band = buildCumulativeMarginBand(tied, 1)
    expect(band.selected.map((r) => r.menuItem)).toEqual(['Alpha'])
  })
})
