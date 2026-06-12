'use client'

import { CircleDollarSign, LayoutGrid, Percent, TrendingUp } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { formatCurrencyWithCode } from '@/lib/currency'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/card'

type Thresholds = {
  avgPopularity: number
  totalProfit: number
  totalMargin: number
}

type Props = {
  thresholds: Thresholds
  itemCount: number
  locale: string
  currency: string
}

export function MatrixPortfolioKpis({ thresholds, itemCount, locale, currency }: Props) {
  const t = useTranslations('analytics.matrix.kpi')

  const marginPct = `${(thresholds.totalMargin * 100).toFixed(1)}%`
  const popularityFmt = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 })

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Card className="gap-4 border-primary/30 py-5 shadow-none sm:py-6">
        <CardHeader className="gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary/10">
            <CircleDollarSign className="text-primary" aria-hidden />
          </div>
          <CardDescription>{t('totalProfit')}</CardDescription>
          <CardTitle className="text-3xl tracking-tight tabular-nums">
            {formatCurrencyWithCode(thresholds.totalProfit, currency, locale)}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-sm text-muted-foreground">{t('totalProfitHint')}</p>
        </CardContent>
      </Card>

      <Card className="gap-4 py-5 shadow-none sm:py-6">
        <CardHeader className="gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-muted">
            <Percent className="text-muted-foreground" aria-hidden />
          </div>
          <CardDescription>{t('portfolioMargin')}</CardDescription>
          <CardTitle className="text-3xl tracking-tight tabular-nums">{marginPct}</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-sm text-muted-foreground">{t('portfolioMarginHint')}</p>
        </CardContent>
      </Card>

      <Card className="gap-4 py-5 shadow-none sm:py-6">
        <CardHeader className="gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-muted">
            <LayoutGrid className="text-muted-foreground" aria-hidden />
          </div>
          <CardDescription>{t('itemsAnalyzed')}</CardDescription>
          <CardTitle className="text-3xl tracking-tight tabular-nums">
            {itemCount.toLocaleString(locale)}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-sm text-muted-foreground">{t('itemsAnalyzedHint')}</p>
        </CardContent>
      </Card>

      <Card className="gap-4 py-5 shadow-none sm:py-6">
        <CardHeader className="gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-muted">
            <TrendingUp className="text-muted-foreground" aria-hidden />
          </div>
          <CardDescription>{t('avgPopularity')}</CardDescription>
          <CardTitle className="text-3xl tracking-tight tabular-nums">
            {popularityFmt.format(thresholds.avgPopularity)}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-sm text-muted-foreground">{t('avgPopularityHint')}</p>
        </CardContent>
      </Card>
    </div>
  )
}
