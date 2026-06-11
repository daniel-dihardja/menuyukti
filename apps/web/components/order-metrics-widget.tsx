import { getTranslations } from 'next-intl/server'

import { formatCurrencyWithCode } from '@/lib/currency'
import { Card, CardDescription, CardHeader, CardTitle } from '@workspace/ui/components/card'

type OrderMetricsWidgetProps = {
  avgOrderSize: number
  avgOrderRevenue: number
  locale: string
  currency: string
}

export async function OrderMetricsWidget({
  avgOrderSize,
  avgOrderRevenue,
  locale,
  currency,
}: OrderMetricsWidgetProps) {
  const t = await getTranslations('analytics.shared.orderMetrics')

  const sizeFmt = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 })

  return (
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
  )
}
