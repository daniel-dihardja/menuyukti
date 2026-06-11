import { getTranslations } from 'next-intl/server'

import { formatCurrencyWithCode } from '@/lib/currency'
import type { OrderMetricsByDayOfWeek } from '@/lib/graphql/queries/analytics'
import { Card, CardDescription, CardHeader, CardTitle } from '@workspace/ui/components/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@workspace/ui/components/table'

type OrderMetricsWidgetProps = {
  avgOrderSize: number
  avgOrderRevenue: number
  locale: string
  currency: string
  byDayOfWeek?: OrderMetricsByDayOfWeek[]
}

const WEEKDAY_ORDER = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const

export async function OrderMetricsWidget({
  avgOrderSize,
  avgOrderRevenue,
  locale,
  currency,
  byDayOfWeek,
}: OrderMetricsWidgetProps) {
  const t = await getTranslations('analytics.shared.orderMetrics')

  const sizeFmt = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 })

  const dayRows =
    byDayOfWeek
      ?.slice()
      .sort(
        (a, b) =>
          WEEKDAY_ORDER.indexOf(a.day as (typeof WEEKDAY_ORDER)[number]) -
          WEEKDAY_ORDER.indexOf(b.day as (typeof WEEKDAY_ORDER)[number]),
      ) ?? []

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t('avgOrderSize')}</CardDescription>
            <CardTitle className="text-2xl tabular-nums">{sizeFmt.format(avgOrderSize)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t('avgOrderRevenue')}</CardDescription>
            <CardTitle className="text-2xl tabular-nums">
              {formatCurrencyWithCode(avgOrderRevenue, currency, locale)}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {dayRows.length > 0 ? (
        <div className="rounded-md border">
          <div className="border-b px-4 py-3">
            <p className="text-sm font-medium">{t('byDayTitle')}</p>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('dayColumn')}</TableHead>
                <TableHead className="text-right">{t('avgOrderSize')}</TableHead>
                <TableHead className="text-right">{t('avgOrderRevenue')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dayRows.map((row) => (
                <TableRow key={row.day}>
                  <TableCell>{t(`days.${row.day}` as 'days.mon')}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {sizeFmt.format(row.avgOrderSize)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatCurrencyWithCode(row.avgOrderRevenue, currency, locale)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : null}
    </div>
  )
}
