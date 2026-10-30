/**
 * Adapter for the Weak items review page: filters menu-engineering matrix items
 * to the weak quadrant and derives avg qty/day + portfolio KPIs.
 */

import { inclusiveCalendarDays } from '@/lib/analytics/period-days'
import {
  distributionToCategoryMap,
  normalizeCategory,
  type DistributionStats,
} from '@/lib/analytics/matrix-page-adapter'
import type { MenuEngineeringMatrixData } from '@/lib/graphql/queries'

type MatrixItem = NonNullable<MenuEngineeringMatrixData['menuEngineeringMatrix']>['items'][number]
type DistributionItem = NonNullable<
  MenuEngineeringMatrixData['menuEngineeringMatrix']
>['distribution'][number]

const VALID_ACTIONS = new Set(['keep', 'promote', 'reprice', 'remove'])

function normalizeAction(raw: string): WeakDisplayRow['action'] {
  const lower = String(raw ?? '')
    .trim()
    .toLowerCase()
  return VALID_ACTIONS.has(lower) ? (lower as WeakDisplayRow['action']) : null
}

export type WeakDisplayRow = {
  menuItem: string
  unitsSold: number
  /** Null when period length is unknown. */
  avgQtyPerDay: number | null
  contributionMargin: number
  contributionMarginShare: number
  action: 'keep' | 'promote' | 'reprice' | 'remove' | null
}

export type WeakPortfolioStats = {
  itemCount: number
  itemShare: number
  marginShare: number
  marginAmount: number
  totalMenuItems: number
  periodDays: number | null
}

export type WeakPageModel = {
  rows: WeakDisplayRow[]
  stats: WeakPortfolioStats
  distributionStats: DistributionStats
}

function toDisplayRow(item: MatrixItem, periodDays: number | null): WeakDisplayRow {
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
 * Build Weak items review rows and portfolio stats from a full matrix payload.
 */
export function adaptWeakPage(
  items: MatrixItem[] | null | undefined,
  distribution: DistributionItem[] | null | undefined,
  periodStart: string | null | undefined,
  periodEnd: string | null | undefined,
): WeakPageModel {
  const periodDays = inclusiveCalendarDays(periodStart, periodEnd)
  const distMap = distributionToCategoryMap(distribution)
  const weakDist = distMap.weak

  const allItems = Array.isArray(items) ? items : []
  const totalMenuItems = allItems.length

  const rows = allItems
    .filter((item) => normalizeCategory(String(item.category ?? '')) === 'weak')
    .map((item) => toDisplayRow(item, periodDays))

  const marginAmount = rows.reduce((sum, row) => sum + row.contributionMargin, 0)
  const totalMargin = allItems.reduce((sum, item) => {
    const m = Number(item.contributionMargin)
    return sum + (Number.isFinite(m) ? m : 0)
  }, 0)

  const itemCount = rows.length
  const itemShare =
    weakDist.itemCount > 0
      ? weakDist.itemShare
      : totalMenuItems > 0
        ? itemCount / totalMenuItems
        : 0
  const marginShare =
    weakDist.itemCount > 0 || weakDist.marginShare > 0
      ? weakDist.marginShare
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
      itemCount: weakDist.itemCount > 0 ? weakDist.itemCount : itemCount,
      itemShare,
      marginShare,
    },
  }
}
