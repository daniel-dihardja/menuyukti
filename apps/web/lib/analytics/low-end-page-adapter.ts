/**
 * Adapter for the Low End review page: filters menu-engineering matrix items
 * to the low_end quadrant and derives avg qty/day + portfolio KPIs.
 */

import { inclusiveCalendarDays } from '@/lib/analytics/period-days'
import {
  distributionToCategoryMap,
  type DistributionStats,
} from '@/lib/analytics/matrix-page-adapter'
import type { MenuEngineeringMatrixData } from '@/lib/graphql/queries'

type MatrixItem = NonNullable<MenuEngineeringMatrixData['menuEngineeringMatrix']>['items'][number]
type DistributionItem = NonNullable<
  MenuEngineeringMatrixData['menuEngineeringMatrix']
>['distribution'][number]

const VALID_ACTIONS = new Set(['keep', 'promote', 'reprice', 'remove'])

function normalizeAction(raw: string): LowEndDisplayRow['action'] {
  const lower = String(raw ?? '')
    .trim()
    .toLowerCase()
  return VALID_ACTIONS.has(lower) ? (lower as LowEndDisplayRow['action']) : null
}

export type LowEndDisplayRow = {
  menuItem: string
  unitsSold: number
  /** Null when period length is unknown. */
  avgQtyPerDay: number | null
  contributionMargin: number
  contributionMarginShare: number
  action: 'keep' | 'promote' | 'reprice' | 'remove' | null
}

export type LowEndPortfolioStats = {
  itemCount: number
  itemShare: number
  marginShare: number
  marginAmount: number
  totalMenuItems: number
  periodDays: number | null
}

export type LowEndPageModel = {
  rows: LowEndDisplayRow[]
  stats: LowEndPortfolioStats
  distributionStats: DistributionStats
}

function toDisplayRow(item: MatrixItem, periodDays: number | null): LowEndDisplayRow {
  const unitsSold = Number.isFinite(Number(item.quantity)) ? Number(item.quantity) : 0
  const rawShare = Number(item.contributionMarginPercentage)
  const contributionMarginShare =
    Number.isFinite(rawShare) && rawShare >= 0 && rawShare <= 1 ? rawShare : 0
  const contributionMargin = Number.isFinite(Number(item.contributionMargin))
    ? Number(item.contributionMargin)
    : 0

  const avgQtyPerDay = periodDays != null && periodDays > 0 ? unitsSold / periodDays : null

  return {
    menuItem: item.menu?.trim() || 'Unknown',
    unitsSold,
    avgQtyPerDay,
    contributionMargin,
    contributionMarginShare,
    action: normalizeAction(item.action),
  }
}

/**
 * Build Low End review rows and portfolio stats from a full matrix payload.
 */
export function adaptLowEndPage(
  items: MatrixItem[] | null | undefined,
  distribution: DistributionItem[] | null | undefined,
  periodStart: string | null | undefined,
  periodEnd: string | null | undefined,
): LowEndPageModel {
  const periodDays = inclusiveCalendarDays(periodStart, periodEnd)
  const distMap = distributionToCategoryMap(distribution)
  const lowEndDist = distMap.low_end

  const allItems = Array.isArray(items) ? items : []
  const totalMenuItems = allItems.length

  const rows = allItems
    .filter(
      (item) =>
        String(item.category ?? '')
          .trim()
          .toLowerCase() === 'low_end',
    )
    .map((item) => toDisplayRow(item, periodDays))

  const marginAmount = rows.reduce((sum, row) => sum + row.contributionMargin, 0)
  const totalMargin = allItems.reduce((sum, item) => {
    const m = Number(item.contributionMargin)
    return sum + (Number.isFinite(m) ? m : 0)
  }, 0)

  const itemCount = rows.length
  const itemShare =
    lowEndDist.itemCount > 0
      ? lowEndDist.itemShare
      : totalMenuItems > 0
        ? itemCount / totalMenuItems
        : 0
  const marginShare =
    lowEndDist.itemCount > 0 || lowEndDist.marginShare > 0
      ? lowEndDist.marginShare
      : totalMargin > 0
        ? marginAmount / totalMargin
        : 0

  return {
    rows,
    stats: {
      itemCount,
      itemShare,
      marginShare,
      marginAmount,
      totalMenuItems,
      periodDays,
    },
    distributionStats: {
      itemCount: lowEndDist.itemCount > 0 ? lowEndDist.itemCount : itemCount,
      itemShare,
      marginShare,
    },
  }
}
