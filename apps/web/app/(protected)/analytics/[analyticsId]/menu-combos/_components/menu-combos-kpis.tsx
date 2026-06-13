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
import { cn } from '@workspace/ui/lib/utils'

type MenuCombosKpisProps = {
  menuCombos: MenuCombosPayload
  locale: string
}

type KpiCardProps = {
  icon: React.ReactNode
  iconWrapperClassName?: string
  label: string
  value: React.ReactNode
  hint: string
  highlighted?: boolean
}

function KpiCard({
  icon,
  iconWrapperClassName,
  label,
  value,
  hint,
  highlighted = false,
}: KpiCardProps) {
  return (
    <Card
      className={cn(
        'min-w-[72%] shrink-0 snap-start gap-3 py-4 shadow-none md:min-w-0 md:py-6',
        highlighted && 'border-primary/30',
      )}
    >
      <CardHeader className="gap-2">
        <div
          className={cn(
            'flex size-10 shrink-0 items-center justify-center rounded-md bg-muted',
            iconWrapperClassName,
          )}
        >
          {icon}
        </div>
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-2xl tracking-tight tabular-nums md:text-3xl">{value}</CardTitle>
      </CardHeader>
      <CardContent className="hidden pt-0 lg:block">
        <p className="text-sm text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  )
}

export function MenuCombosKpis({ menuCombos, locale }: MenuCombosKpisProps) {
  const t = useTranslations('analytics.menuCombos')
  const tInsights = useTranslations('analytics.menuCombos.insights')

  const multiItemShare = multiItemOrderShare(menuCombos)
  const numberFmt = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 })
  const countFmt = new Intl.NumberFormat(locale)
  const isStarsScope = menuCombos.scope === 'stars'

  return (
    <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-1 snap-x snap-mandatory lg:mx-0 lg:grid lg:grid-cols-2 lg:gap-4 lg:overflow-visible lg:px-0 lg:pb-0 lg:snap-none xl:grid-cols-4">
      <KpiCard
        icon={<ShoppingBag className="text-muted-foreground" aria-hidden />}
        label={t('kpi.totalOrders')}
        value={countFmt.format(menuCombos.totalOrders)}
        hint={t('kpi.totalOrdersHint')}
      />

      <KpiCard
        icon={<UtensilsCrossed className="text-primary" aria-hidden />}
        iconWrapperClassName="bg-primary/10"
        label={t('kpi.multiItemShare')}
        value={formatPercent(multiItemShare, locale)}
        hint={t('kpi.multiItemShareHint')}
        highlighted
      />

      <KpiCard
        icon={<LayoutGrid className="text-muted-foreground" aria-hidden />}
        label={t('kpi.avgItems')}
        value={numberFmt.format(menuCombos.avgDistinctItemsPerOrder)}
        hint={t('kpi.avgItemsHint')}
      />

      <KpiCard
        icon={
          <Sparkles
            className={isStarsScope ? 'text-primary' : 'text-muted-foreground'}
            aria-hidden
          />
        }
        iconWrapperClassName={isStarsScope ? 'bg-primary/10' : undefined}
        label={t('kpi.scope')}
        value={
          <span className="text-xl md:text-xl">
            {isStarsScope ? tInsights('scopeStars') : tInsights('scopeTopSellers')}
          </span>
        }
        hint={isStarsScope ? t('kpi.scopeStarsHint') : t('kpi.scopeTopSellersHint')}
        highlighted={isStarsScope}
      />
    </div>
  )
}
