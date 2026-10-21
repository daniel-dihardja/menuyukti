'use client'

import { CircleDollarSign, LayoutGrid, Percent, PieChart } from 'lucide-react'
import { useTranslations } from 'next-intl'

import type { LowEndPortfolioStats } from '@/lib/analytics/low-end-page-adapter'
import { formatCurrencyWithCode } from '@/lib/currency'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/card'

type Props = {
  stats: LowEndPortfolioStats
  locale: string
  currency: string
}

export function LowEndKpis({ stats, locale, currency }: Props) {
  const t = useTranslations('analytics.lowEnd.kpi')

  const itemSharePct = `${(stats.itemShare * 100).toFixed(1)}%`
  const marginSharePct = `${(stats.marginShare * 100).toFixed(1)}%`

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Card className="gap-4 border-primary/30 py-5 shadow-none sm:py-6">
        <CardHeader className="gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary/10">
            <LayoutGrid className="text-primary" aria-hidden />
          </div>
          <CardDescription>{t('itemCount')}</CardDescription>
          <CardTitle className="text-3xl tracking-tight tabular-nums">
            {stats.itemCount.toLocaleString(locale)}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-sm text-muted-foreground">
            {t('itemCountHint', {
              count: stats.itemCount,
              total: stats.totalMenuItems,
              share: itemSharePct,
            })}
          </p>
        </CardContent>
      </Card>

      <Card className="gap-4 py-5 shadow-none sm:py-6">
        <CardHeader className="gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-muted">
            <Percent className="text-muted-foreground" aria-hidden />
          </div>
          <CardDescription>{t('itemShare')}</CardDescription>
          <CardTitle className="text-3xl tracking-tight tabular-nums">{itemSharePct}</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-sm text-muted-foreground">{t('itemShareHint')}</p>
        </CardContent>
      </Card>

      <Card className="gap-4 py-5 shadow-none sm:py-6">
        <CardHeader className="gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-muted">
            <PieChart className="text-muted-foreground" aria-hidden />
          </div>
          <CardDescription>{t('marginShare')}</CardDescription>
          <CardTitle className="text-3xl tracking-tight tabular-nums">{marginSharePct}</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-sm text-muted-foreground">{t('marginShareHint')}</p>
        </CardContent>
      </Card>

      <Card className="gap-4 py-5 shadow-none sm:py-6">
        <CardHeader className="gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-muted">
            <CircleDollarSign className="text-muted-foreground" aria-hidden />
          </div>
          <CardDescription>{t('marginAmount')}</CardDescription>
          <CardTitle className="text-3xl tracking-tight tabular-nums">
            {formatCurrencyWithCode(stats.marginAmount, currency, locale)}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-sm text-muted-foreground">{t('marginAmountHint')}</p>
        </CardContent>
      </Card>
    </div>
  )
}
