import { CircleDollarSign, ShoppingBag } from 'lucide-react'
import { getTranslations } from 'next-intl/server'

import { formatCurrencyWithCode } from '@/lib/currency'
import type { SlotDemandCell } from '@/lib/graphql/queries/analytics'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/card'

import { OrderMetricsVenueHeatmap } from './order-metrics-venue-heatmap'

type OrderMetricsViewProps = {
  avgOrderSize: number
  avgOrderRevenue: number
  slotDemandProfile: SlotDemandCell[]
  locale: string
  currency: string
}

export async function OrderMetricsView({
  avgOrderSize,
  avgOrderRevenue,
  slotDemandProfile,
  locale,
  currency,
}: OrderMetricsViewProps) {
  const tMetrics = await getTranslations('analytics.shared.orderMetrics')
  const tPage = await getTranslations('analytics.orderMetrics')

  const sizeFmt = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 })

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

      {slotDemandProfile.length > 0 ? (
        <OrderMetricsVenueHeatmap slotDemandProfile={slotDemandProfile} locale={locale} />
      ) : null}
    </div>
  )
}
