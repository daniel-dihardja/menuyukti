'use client'

import { useCallback, useEffect, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'

import { MenuHeatmapContent } from '@/app/(protected)/analytics/[analyticsId]/heatmap/menu-heatmap-content'
import type { MenuEngineeringMatrixData, MenuHeatmapsData } from '@/lib/graphql/queries/analytics'
import { Alert, AlertDescription, AlertTitle } from '@workspace/ui/components/alert'
import { Button } from '@workspace/ui/components/button'
import { Skeleton } from '@workspace/ui/components/skeleton'

type MatrixItem = NonNullable<MenuEngineeringMatrixData['menuEngineeringMatrix']>['items'][number]

type LoadState =
  | { status: 'idle' }
  | { status: 'loading' }
  | {
      status: 'ready'
      menuHeatmaps: MenuHeatmapsData['menuHeatmaps']
      matrixItems: MatrixItem[] | null
      dailyStartHour: number
      dailyEndHour: number
      usedFallbackRun: boolean
    }
  | { status: 'error' }

type MenuItemHeatmapCardProps = {
  locationId: number
  analyticsRunId: number | null
}

export function MenuItemHeatmapCard({ locationId, analyticsRunId }: MenuItemHeatmapCardProps) {
  const locale = useLocale()
  const t = useTranslations('chat.visualizations')
  const [loadState, setLoadState] = useState<LoadState>({ status: 'idle' })
  const [reloadToken, setReloadToken] = useState(0)

  const fetchData = useCallback(async () => {
    setLoadState({ status: 'loading' })
    try {
      const params = new URLSearchParams({ locationId: String(locationId) })
      if (analyticsRunId !== null) {
        params.set('analyticsRunId', String(analyticsRunId))
      }
      const res = await fetch(`/api/analytics/menu-heatmaps?${params.toString()}`, {
        cache: 'no-store',
      })
      if (!res.ok) {
        throw new Error('fetch failed')
      }
      const body = (await res.json()) as {
        menuHeatmaps?: MenuHeatmapsData['menuHeatmaps']
        matrixItems?: MatrixItem[] | null
        dailyStartHour?: number
        dailyEndHour?: number
        usedFallbackRun?: boolean
      }
      setLoadState({
        status: 'ready',
        menuHeatmaps: Array.isArray(body.menuHeatmaps) ? body.menuHeatmaps : [],
        matrixItems: Array.isArray(body.matrixItems) ? body.matrixItems : null,
        dailyStartHour: typeof body.dailyStartHour === 'number' ? body.dailyStartHour : 8,
        dailyEndHour: typeof body.dailyEndHour === 'number' ? body.dailyEndHour : 22,
        usedFallbackRun: body.usedFallbackRun === true,
      })
    } catch {
      setLoadState({ status: 'error' })
    }
  }, [analyticsRunId, locationId])

  useEffect(() => {
    void fetchData()
  }, [fetchData, reloadToken])

  if (loadState.status === 'loading' || loadState.status === 'idle') {
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

  if (loadState.status === 'error') {
    return (
      <Alert variant="destructive">
        <AlertTitle>{t('loadErrorTitle')}</AlertTitle>
        <AlertDescription className="flex flex-col gap-3">
          <p>{t('loadErrorDescription')}</p>
          <Button
            className="w-fit"
            onClick={() => setReloadToken((token) => token + 1)}
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

  if (loadState.menuHeatmaps.length === 0) {
    return <p className="text-muted-foreground text-sm">{t('emptyMenuHeatmapDescription')}</p>
  }

  return (
    <div className="flex flex-col gap-3">
      {loadState.usedFallbackRun ? (
        <p className="text-muted-foreground text-xs">{t('fallbackRunHint')}</p>
      ) : null}
      <MenuHeatmapContent
        dailyEndHour={loadState.dailyEndHour}
        dailyStartHour={loadState.dailyStartHour}
        locale={locale}
        matrixItems={loadState.matrixItems}
        menuHeatmaps={loadState.menuHeatmaps}
        variant="compact"
      />
    </div>
  )
}
