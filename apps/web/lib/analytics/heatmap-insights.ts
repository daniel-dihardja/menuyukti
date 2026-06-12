export type HeatmapInsightRow = {
  key: string
  label: string
  values: number[]
}

export function computeColumnTotals(rows: HeatmapInsightRow[]): number[] {
  if (rows.length === 0) return []

  const columnCount = rows[0]?.values.length ?? 0
  const totals = Array.from({ length: columnCount }, () => 0)

  for (const row of rows) {
    for (let i = 0; i < columnCount; i++) {
      totals[i] = (totals[i] ?? 0) + (row.values[i] ?? 0)
    }
  }

  return totals
}

export function findPeakColumnIndex(totals: number[]): number | null {
  if (totals.length === 0) return null

  let peakIndex = 0
  let peakValue = totals[0] ?? 0

  for (let i = 1; i < totals.length; i++) {
    const value = totals[i] ?? 0
    if (value > peakValue) {
      peakValue = value
      peakIndex = i
    }
  }

  return peakValue > 0 ? peakIndex : null
}

export function findTopRowByTotal(rows: HeatmapInsightRow[]): HeatmapInsightRow | null {
  if (rows.length === 0) return null

  let top = rows[0]!
  let topTotal = rowTotal(top)

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i]!
    const total = rowTotal(row)
    if (total > topTotal) {
      top = row
      topTotal = total
    }
  }

  return topTotal > 0 ? top : null
}

export function computeScaleBounds(rows: HeatmapInsightRow[]): { min: number; max: number } {
  const values = rows.flatMap((row) => row.values)
  if (values.length === 0) {
    return { min: 0, max: 0 }
  }

  return {
    min: Math.min(...values),
    max: Math.max(...values),
  }
}

function rowTotal(row: HeatmapInsightRow): number {
  return row.values.reduce((sum, value) => sum + value, 0)
}
