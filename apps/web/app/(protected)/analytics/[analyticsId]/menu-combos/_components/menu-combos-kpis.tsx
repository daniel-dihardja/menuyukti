'use client'

import { LayoutGrid, ShoppingBag, Sparkles, UtensilsCrossed } from 'lucide-react'
import { useTranslations } from 'next-intl'

import {
  formatPercent,
  multiItemOrderShare,
  type MenuCombosPayload,
} from '@/lib/analytics/menu-combos-page-adapter'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/card'

type MenuCombosKpisProps = {
  menuCombos: MenuCombosPayload
  locale: string
}

export function MenuCombosKpis({ menuCombos, locale }: MenuCombosKpisProps) {
  const t = useTranslations('analytics.menuCombos')
  const tInsights = useTranslations('analytics.menuCombos.insights')

  const multiItemShare = multiItemOrderShare(menuCombos)
  const numberFmt = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 })
  const countFmt = new Intl.NumberFormat(locale)
  const isStarsScope = menuCombos.scope === 'stars'

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Card className="gap-4 py-5 shadow-none sm:py-6">
        <CardHeader className="gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-muted">
            <ShoppingBag className="text-muted-foreground" aria-hidden />
          </div>
          <CardDescription>{t('kpi.totalOrders')}</CardDescription>
          <CardTitle className="text-3xl tracking-tight tabular-nums">
            {countFmt.format(menuCombos.totalOrders)}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-sm text-muted-foreground">{t('kpi.totalOrdersHint')}</p>
        </CardContent>
      </Card>

      <Card className="gap-4 border-primary/30 py-5 shadow-none sm:py-6">
        <CardHeader className="gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary/10">
            <UtensilsCrossed className="text-primary" aria-hidden />
          </div>
          <CardDescription>{t('kpi.multiItemShare')}</CardDescription>
          <CardTitle className="text-3xl tracking-tight tabular-nums">
            {formatPercent(multiItemShare, locale)}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-sm text-muted-foreground">{t('kpi.multiItemShareHint')}</p>
        </CardContent>
      </Card>

      <Card className="gap-4 py-5 shadow-none sm:py-6">
        <CardHeader className="gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-muted">
            <LayoutGrid className="text-muted-foreground" aria-hidden />
          </div>
          <CardDescription>{t('kpi.avgItems')}</CardDescription>
          <CardTitle className="text-3xl tracking-tight tabular-nums">
            {numberFmt.format(menuCombos.avgDistinctItemsPerOrder)}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-sm text-muted-foreground">{t('kpi.avgItemsHint')}</p>
        </CardContent>
      </Card>

      <Card
        className={
          isStarsScope
            ? 'gap-4 border-primary/30 py-5 shadow-none sm:py-6'
            : 'gap-4 py-5 shadow-none sm:py-6'
        }
      >
        <CardHeader className="gap-3">
          <div
            className={
              isStarsScope
                ? 'flex size-10 shrink-0 items-center justify-center rounded-md bg-primary/10'
                : 'flex size-10 shrink-0 items-center justify-center rounded-md bg-muted'
            }
          >
            <Sparkles
              className={isStarsScope ? 'text-primary' : 'text-muted-foreground'}
              aria-hidden
            />
          </div>
          <CardDescription>{t('kpi.scope')}</CardDescription>
          <CardTitle className="text-xl tracking-tight">
            {isStarsScope ? tInsights('scopeStars') : tInsights('scopeTopSellers')}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-sm text-muted-foreground">
            {isStarsScope ? t('kpi.scopeStarsHint') : t('kpi.scopeTopSellersHint')}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
