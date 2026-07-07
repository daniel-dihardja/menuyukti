'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { parseAsString, useQueryState } from 'nuqs'
import { Badge } from '@workspace/ui/components/badge'
import { Button } from '@workspace/ui/components/button'
import type { MenuEngineeringMatrixData, MenuHeatmapsData } from '@/lib/graphql/queries/analytics'
import { routes } from '@/lib/routes'
import { MenuHeatmapContent } from './menu-heatmap-content'

type MatrixItem = NonNullable<MenuEngineeringMatrixData['menuEngineeringMatrix']>['items'][number]

type HeatmapViewProps = {
  analyticsId: number
  menuHeatmaps: MenuHeatmapsData['menuHeatmaps']
  matrixItems: MatrixItem[] | null
  locale: string
  dailyStartHour: number
  dailyEndHour: number
}

export function HeatmapView({
  analyticsId,
  menuHeatmaps,
  matrixItems,
  locale,
  dailyStartHour,
  dailyEndHour,
}: HeatmapViewProps) {
  const t = useTranslations('analytics.heatmap')
  const [categoryFilter, setCategoryFilter] = useQueryState(
    'category',
    parseAsString.withDefault('all'),
  )

  const reportingPeriod = useMemo(() => {
    const period = menuHeatmaps.find((row) => row.reportingPeriod?.trim())?.reportingPeriod?.trim()
    return period ?? null
  }, [menuHeatmaps])

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        {reportingPeriod ? (
          <Badge variant="secondary">
            {t('insights.reportingPeriod', { period: reportingPeriod })}
          </Badge>
        ) : null}
        <Button asChild variant="outline" size="sm">
          <Link href={routes.analytics.matrix(analyticsId)}>{t('linkToMatrix')}</Link>
        </Button>
      </div>

      <MenuHeatmapContent
        categoryFilter={categoryFilter}
        dailyEndHour={dailyEndHour}
        dailyStartHour={dailyStartHour}
        locale={locale}
        matrixItems={matrixItems}
        menuHeatmaps={menuHeatmaps}
        onCategoryFilterChange={(value) => {
          void setCategoryFilter(value)
        }}
        variant="report"
      />
    </div>
  )
}
