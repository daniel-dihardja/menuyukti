import type { OrderMetricsByDayOfWeek } from '@/lib/graphql/queries/analytics'

const WEEKDAY_ORDER = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const

export type WeekdayKey = (typeof WEEKDAY_ORDER)[number]

export type EnrichedOrderMetricsDayRow = OrderMetricsByDayOfWeek & {
  revenueSharePct: number
  isPeakRevenueDay: boolean
}

export function sortOrderMetricsByDay(rows: OrderMetricsByDayOfWeek[]): OrderMetricsByDayOfWeek[] {
  return rows
    .slice()
    .sort(
      (a, b) =>
        WEEKDAY_ORDER.indexOf(a.day as WeekdayKey) - WEEKDAY_ORDER.indexOf(b.day as WeekdayKey),
    )
}

export function enrichOrderMetricsRows(
  rows: OrderMetricsByDayOfWeek[],
): EnrichedOrderMetricsDayRow[] {
  const sorted = sortOrderMetricsByDay(rows)
  if (sorted.length === 0) return []

  const maxRevenue = Math.max(...sorted.map((row) => row.avgOrderRevenue))
  const hasPeak = maxRevenue > 0

  return sorted.map((row) => ({
    ...row,
    revenueSharePct: hasPeak ? (row.avgOrderRevenue / maxRevenue) * 100 : 0,
    isPeakRevenueDay: hasPeak && row.avgOrderRevenue === maxRevenue,
  }))
}

export function getPeakRevenueDay(rows: OrderMetricsByDayOfWeek[]): OrderMetricsByDayOfWeek | null {
  const enriched = enrichOrderMetricsRows(rows)
  return enriched.find((row) => row.isPeakRevenueDay) ?? null
}
