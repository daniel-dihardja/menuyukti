'use client'

import { useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'

import { buildCumulativeMarginBand } from '@/lib/analytics/cumulative-margin-band'
import { adaptWeakPage, type WeakDisplayRow } from '@/lib/analytics/weak-page-adapter'
import type { MenuEngineeringMatrixData } from '@/lib/graphql/queries'
import { Alert, AlertDescription } from '@workspace/ui/components/alert'

import { WeakImpactPanel } from '@/components/analytics/weak/weak-impact-panel'
import { WeakKpis } from '@/components/analytics/weak/weak-kpis'
import { WeakTable } from '@/components/analytics/weak/weak-table'

type MatrixItem = NonNullable<MenuEngineeringMatrixData['menuEngineeringMatrix']>['items'][number]
type DistributionItem = NonNullable<
  MenuEngineeringMatrixData['menuEngineeringMatrix']
>['distribution'][number]

type Props = {
  items: MatrixItem[]
  distribution: DistributionItem[]
  periodStart: string | null
  periodEnd: string | null
  locale: string
  currency: string
}

export function WeakView({ items, distribution, periodStart, periodEnd, locale, currency }: Props) {
  const t = useTranslations('analytics.weak')
  const [sliderValue, setSliderValue] = useState(0)

  const { rows, stats } = useMemo(
    () => adaptWeakPage(items, distribution, periodStart, periodEnd),
    [items, distribution, periodStart, periodEnd],
  )

  const showAvgQtyPerDay = stats.periodDays != null && stats.periodDays > 0

  const band = useMemo(
    () => buildCumulativeMarginBand(rows, sliderValue, locale),
    [rows, sliderValue, locale],
  )

  const highlightedMenuItems = useMemo(
    () => new Set(band.selected.map((row: WeakDisplayRow) => row.menuItem)),
    [band.selected],
  )

  if (rows.length === 0) {
    return (
      <div className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">
        {t('empty.noItems')}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <WeakKpis stats={stats} locale={locale} currency={currency} />

      {!showAvgQtyPerDay ? (
        <Alert>
          <AlertDescription>{t('avgQtyUnavailable')}</AlertDescription>
        </Alert>
      ) : null}

      <WeakImpactPanel
        sliderValue={sliderValue}
        onSliderChange={setSliderValue}
        impactItemCount={band.itemCount}
        impactMarginShare={band.marginShare}
        impactMarginAmount={band.marginAmount}
        locale={locale}
        currency={currency}
      />

      <WeakTable
        rows={rows}
        highlightedMenuItems={highlightedMenuItems}
        showAvgQtyPerDay={showAvgQtyPerDay}
        locale={locale}
        currency={currency}
      />
    </div>
  )
}
