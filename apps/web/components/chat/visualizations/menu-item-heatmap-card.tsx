'use client'

import { useLocale, useTranslations } from 'next-intl'
import useSWR from 'swr'

import { MenuHeatmapContent } from '@/app/(protected)/analytics/[analyticsId]/heatmap/menu-heatmap-content'
import type { MenuEngineeringMatrixData, MenuHeatmapsData } from '@/lib/graphql/queries/analytics'
import { Alert, AlertDescription, AlertTitle } from '@workspace/ui/components/alert'
import { Button } from '@workspace/ui/components/button'
import { Skeleton } from '@workspace/ui/components/skeleton'

import { chatVizJsonFetcher, chatVizQueryUrl } from './chat-viz-fetcher'

type MatrixItem = NonNullable<MenuEngineeringMatrixData['menuEngineeringMatrix']>['items'][number]

type MenuHeatmapsResponse = {
  menuHeatmaps?: MenuHeatmapsData['menuHeatmaps']
  matrixItems?: MatrixItem[] | null
  dailyStartHour?: number
  dailyEndHour?: number
  usedFallbackRun?: boolean
}

type MenuItemHeatmapCardProps = {
  locationId: number
  analyticsRunId: number | null
}

export function MenuItemHeatmapCard({ locationId, analyticsRunId }: MenuItemHeatmapCardProps) {
  const locale = useLocale()
  const t = useTranslations('chat.visualizations')
  const url = chatVizQueryUrl('/api/analytics/menu-heatmaps', locationId, analyticsRunId)
  const { data, error, isLoading, mutate } = useSWR(url, chatVizJsonFetcher<MenuHeatmapsResponse>, {
    revalidateOnFocus: false,
  })

  if (isLoading || (!data && !error)) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-4 w-32" />
        <div className="grid grid-cols-4 gap-1">
          {Array.from({ length: 12 }, (_, i) => (
            <Skeleton className="h-8 rounded-sm" key={`menu-heatmap-skeleton-${i}`} />
          ))}
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <Alert variant="destructive">
        <AlertTitle>{t('loadErrorTitle')}</AlertTitle>
        <AlertDescription className="flex flex-col gap-3">
          <p>{t('loadErrorDescription')}</p>
          <Button
            className="w-fit"
            onClick={() => void mutate()}
            size="sm"
            type="button"
            variant="outline"
          >
            {t('retry')}
          </Button>
        </AlertDescription>
      </Alert>
    )
  }

  const menuHeatmaps = Array.isArray(data.menuHeatmaps) ? data.menuHeatmaps : []
  const matrixItems = Array.isArray(data.matrixItems) ? data.matrixItems : null
  const dailyStartHour = typeof data.dailyStartHour === 'number' ? data.dailyStartHour : 8
  const dailyEndHour = typeof data.dailyEndHour === 'number' ? data.dailyEndHour : 22
  const usedFallbackRun = data.usedFallbackRun === true

  if (menuHeatmaps.length === 0) {
    return <p className="text-muted-foreground text-sm">{t('emptyMenuHeatmapDescription')}</p>
  }

  return (
    <div className="flex flex-col gap-3">
      {usedFallbackRun ? (
        <p className="text-muted-foreground text-xs">{t('fallbackRunHint')}</p>
      ) : null}
      <MenuHeatmapContent
        dailyEndHour={dailyEndHour}
        dailyStartHour={dailyStartHour}
        locale={locale}
        matrixItems={matrixItems}
        menuHeatmaps={menuHeatmaps}
        variant="compact"
      />
    </div>
  )
}
