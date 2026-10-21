export type CumulativeMarginBandRow = {
  contributionMarginShare: number
  contributionMargin: number
  menuItem: string
}

export type CumulativeMarginBandResult<T extends CumulativeMarginBandRow> = {
  /** Rows included in the cumulative band (lowest margin share first). */
  selected: T[]
  itemCount: number
  /** Sum of selected contributionMarginShare (0–1). */
  marginShare: number
  /** Sum of selected contributionMargin (currency units). */
  marginAmount: number
}

/**
 * Select the weakest items (lowest margin share first) whose cumulative
 * margin share stays within `thresholdPct` percent of total portfolio margin.
 *
 * @param thresholdPct - Percent of total margin (e.g. 2.5 → 2.5%). Values ≤ 0 yield an empty band.
 */
export function buildCumulativeMarginBand<T extends CumulativeMarginBandRow>(
  rows: T[],
  thresholdPct: number,
  locale = 'en',
): CumulativeMarginBandResult<T> {
  const empty: CumulativeMarginBandResult<T> = {
    selected: [],
    itemCount: 0,
    marginShare: 0,
    marginAmount: 0,
  }

  if (!Number.isFinite(thresholdPct) || thresholdPct <= 0 || rows.length === 0) {
    return empty
  }

  const threshold = thresholdPct / 100
  const sorted = [...rows].sort((a, b) => {
    const diff = a.contributionMarginShare - b.contributionMarginShare
    return diff !== 0 ? diff : a.menuItem.localeCompare(b.menuItem, locale)
  })

  const selected: T[] = []
  let sum = 0
  let marginAmount = 0

  for (const row of sorted) {
    const share = Number.isFinite(row.contributionMarginShare) ? row.contributionMarginShare : 0
    const amount = Number.isFinite(row.contributionMargin) ? row.contributionMargin : 0
    if (sum + share <= threshold + 1e-9) {
      selected.push(row)
      sum += share
      marginAmount += amount
    } else {
      break
    }
  }

  return {
    selected,
    itemCount: selected.length,
    marginShare: sum,
    marginAmount,
  }
}
