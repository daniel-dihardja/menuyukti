'use client'

import { useMemo } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import useSWR from 'swr'

import { HeatmapMatrixEmbedded } from '@/app/(protected)/analytics/[analyticsId]/heatmap/heatmap-matrix'
import { buildLiftMatrixRows, formatLift } from '@/lib/analytics/menu-combos-page-adapter'
import { Alert, AlertDescription, AlertTitle } from '@workspace/ui/components/alert'
import { Button } from '@workspace/ui/components/button'
import { Skeleton } from '@workspace/ui/components/skeleton'

import { chatVizJsonFetcher, chatVizQueryUrl } from './chat-viz-fetcher'

type LiftMatrixResponse = {
  focusMenus?: string[]
  matrixLift?: Array<Array<number | null>>
  usedFallbackRun?: boolean
}

type PairLiftMatrixCardProps = {
  locationId: number
  analyticsRunId: number | null
}

export function PairLiftMatrixCard({ locationId, analyticsRunId }: PairLiftMatrixCardProps) {
  const locale = useLocale()
  const t = useTranslations('chat.visualizations')
  const tMatrix = useTranslations('analytics.menuCombos.matrix')
  const url = chatVizQueryUrl('/api/analytics/menu-combos-lift-matrix', locationId, analyticsRunId)
  const { data, error, isLoading, mutate } = useSWR(url, chatVizJsonFetcher<LiftMatrixResponse>, {
    revalidateOnFocus: false,
  })

  const usedFallbackRun = data?.usedFallbackRun === true

  const matrixRows = useMemo(() => {
    const focusMenus = Array.isArray(data?.focusMenus) ? data.focusMenus : []
    const matrixLift = Array.isArray(data?.matrixLift) ? data.matrixLift : []
    return buildLiftMatrixRows(focusMenus, matrixLift)
  }, [data?.focusMenus, data?.matrixLift])

  const focusMenus = Array.isArray(data?.focusMenus) ? data.focusMenus : []

  const matrixLabels = useMemo(
    () => ({
      menuColumnLabel: tMatrix('menuColumn'),
      legendLow: tMatrix('legendLow'),
      legendHigh: tMatrix('legendHigh'),
      unitsLabel: tMatrix('unitsLabel'),
      totalsRowLabel: tMatrix('totalsRowLabel'),
      sortHint: tMatrix('sortHint'),
      scrollHint: tMatrix('scrollHint'),
      explainTitle: tMatrix('explainTitle'),
      explainBody: tMatrix('explainBody'),
      cellAriaLabel: (menu: string, other: string, lift: number) =>
        tMatrix('cellAriaLabel', { menu, other, lift: formatLift(lift, locale) }),
      cellTooltip: (menu: string, other: string, lift: number) =>
        tMatrix('cellTooltip', { menu, other, lift: formatLift(lift, locale) }),
    }),
    [locale, tMatrix],
  )

  if (isLoading || (!data && !error)) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-3 w-full max-w-sm" />
        <div className="grid grid-cols-4 gap-1">
          {Array.from({ length: 12 }, (_, i) => (
            <Skeleton className="h-8 rounded-sm" key={`lift-matrix-skeleton-${i}`} />
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

  if (matrixRows.length < 2) {
    return <p className="text-muted-foreground text-sm">{t('emptyPairLiftMatrixDescription')}</p>
  }

  return (
    <div className="flex flex-col gap-3">
      {usedFallbackRun ? (
        <p className="text-muted-foreground text-xs">{t('fallbackRunHint')}</p>
      ) : null}
      <div className="overflow-x-auto">
        <HeatmapMatrixEmbedded
          columnLabels={focusMenus}
          density="compact"
          labels={matrixLabels}
          maskDiagonal
          rows={matrixRows}
          showExplanation={false}
          showTotalsRow={false}
        />
      </div>
    </div>
  )
}
