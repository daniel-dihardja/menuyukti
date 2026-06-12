import { CircleDollarSign, Lightbulb, ShoppingBag } from 'lucide-react'
import { getTranslations } from 'next-intl/server'

import {
  enrichOrderMetricsRows,
  getPeakRevenueDay,
} from '@/lib/analytics/order-metrics-page-adapter'
import { formatCurrencyWithCode } from '@/lib/currency'
import type { OrderMetricsByDayOfWeek } from '@/lib/graphql/queries/analytics'
import { Alert, AlertDescription, AlertTitle } from '@workspace/ui/components/alert'
import { Badge } from '@workspace/ui/components/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@workspace/ui/components/table'

type OrderMetricsViewProps = {
  avgOrderSize: number
  avgOrderRevenue: number
  byDayOfWeek: OrderMetricsByDayOfWeek[]
  locale: string
  currency: string
}

export async function OrderMetricsView({
  avgOrderSize,
  avgOrderRevenue,
  byDayOfWeek,
  locale,
  currency,
}: OrderMetricsViewProps) {
  const tMetrics = await getTranslations('analytics.shared.orderMetrics')
  const tPage = await getTranslations('analytics.orderMetrics')

  const sizeFmt = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 })
  const dayRows = enrichOrderMetricsRows(byDayOfWeek)
  const peakDay = getPeakRevenueDay(byDayOfWeek)

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="gap-4 py-5 shadow-none sm:py-6">
          <CardHeader className="gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-muted">
              <ShoppingBag className="text-muted-foreground" aria-hidden />
            </div>
            <CardDescription>{tMetrics('avgOrderSize')}</CardDescription>
            <CardTitle className="text-3xl tracking-tight tabular-nums">
              {sizeFmt.format(avgOrderSize)}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-sm text-muted-foreground">{tPage('kpi.orderSizeHint')}</p>
          </CardContent>
        </Card>

        <Card className="gap-4 border-primary/30 py-5 shadow-none sm:py-6">
          <CardHeader className="gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary/10">
              <CircleDollarSign className="text-primary" aria-hidden />
            </div>
            <CardDescription>{tMetrics('avgOrderRevenue')}</CardDescription>
            <CardTitle className="text-3xl tracking-tight tabular-nums">
              {formatCurrencyWithCode(avgOrderRevenue, currency, locale)}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-sm text-muted-foreground">{tPage('kpi.orderRevenueHint')}</p>
          </CardContent>
        </Card>
      </div>

      {peakDay ? (
        <Alert>
          <Lightbulb aria-hidden />
          <AlertTitle>{tPage('insightTitle')}</AlertTitle>
          <AlertDescription>
            {tPage('insightPeakRevenue', {
              day: tMetrics(`days.${peakDay.day}` as 'days.mon'),
              amount: formatCurrencyWithCode(peakDay.avgOrderRevenue, currency, locale),
            })}
          </AlertDescription>
        </Alert>
      ) : null}

      {dayRows.length > 0 ? (
        <Card className="gap-0 py-0 shadow-none">
          <CardHeader className="border-b border-card-border py-5 sm:py-6">
            <CardTitle className="text-base">{tPage('weeklyTitle')}</CardTitle>
            <CardDescription>{tPage('weeklyDescription')}</CardDescription>
          </CardHeader>
          <CardContent className="px-0 pt-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{tMetrics('dayColumn')}</TableHead>
                  <TableHead className="text-right">{tMetrics('avgOrderSize')}</TableHead>
                  <TableHead className="text-right">{tMetrics('avgOrderRevenue')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dayRows.map((row) => (
                  <TableRow key={row.day}>
                    <TableCell>
                      <div className="flex flex-wrap items-center gap-2">
                        <span>{tMetrics(`days.${row.day}` as 'days.mon')}</span>
                        {row.isPeakRevenueDay ? (
                          <Badge variant="secondary">{tPage('peakDayBadge')}</Badge>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {sizeFmt.format(row.avgOrderSize)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-col items-end gap-1.5">
                        <span className="tabular-nums">
                          {formatCurrencyWithCode(row.avgOrderRevenue, currency, locale)}
                        </span>
                        <div
                          className="h-1.5 w-full max-w-28 overflow-hidden rounded-full bg-muted"
                          role="presentation"
                        >
                          <div
                            className="h-full rounded-full bg-primary/40"
                            style={{ width: `${row.revenueSharePct}%` }}
                          />
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
