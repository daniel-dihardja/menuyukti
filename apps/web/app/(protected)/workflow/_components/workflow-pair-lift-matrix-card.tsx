'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'

import { HeatmapMatrixEmbedded } from '@/app/(protected)/analytics/[analyticsId]/heatmap/heatmap-matrix'
import { buildLiftMatrixRows, formatLift } from '@/lib/analytics/menu-combos-page-adapter'
import { Alert, AlertDescription, AlertTitle } from '@workspace/ui/components/alert'
import { Button } from '@workspace/ui/components/button'
import { Skeleton } from '@workspace/ui/components/skeleton'

type LoadState =
  | { status: 'idle' }
  | { status: 'loading' }
  | {
      status: 'ready'
      focusMenus: string[]
      matrixLift: Array<Array<number | null>>
      usedFallbackRun: boolean
    }
  | { status: 'error' }

type WorkflowPairLiftMatrixCardProps = {
  locationId: number
  analyticsRunId: number | null
}

export function WorkflowPairLiftMatrixCard({
  locationId,
  analyticsRunId,
}: WorkflowPairLiftMatrixCardProps) {
  const locale = useLocale()
  const t = useTranslations('analytics.workflows.visualizations')
  const tMatrix = useTranslations('analytics.menuCombos.matrix')
  const [loadState, setLoadState] = useState<LoadState>({ status: 'idle' })
  const [reloadToken, setReloadToken] = useState(0)

  const fetchData = useCallback(async () => {
    setLoadState({ status: 'loading' })
    try {
      const params = new URLSearchParams({ locationId: String(locationId) })
      if (analyticsRunId !== null) {
        params.set('analyticsRunId', String(analyticsRunId))
      }
      const res = await fetch(`/api/analytics/menu-combos-lift-matrix?${params.toString()}`, {
        cache: 'no-store',
      })
      if (!res.ok) {
        throw new Error('fetch failed')
      }
      const body = (await res.json()) as {
        focusMenus?: string[]
        matrixLift?: Array<Array<number | null>>
        usedFallbackRun?: boolean
      }
      setLoadState({
        status: 'ready',
        focusMenus: Array.isArray(body.focusMenus) ? body.focusMenus : [],
        matrixLift: Array.isArray(body.matrixLift) ? body.matrixLift : [],
        usedFallbackRun: body.usedFallbackRun === true,
      })
    } catch {
      setLoadState({ status: 'error' })
    }
  }, [analyticsRunId, locationId])

  useEffect(() => {
    void fetchData()
  }, [fetchData, reloadToken])

  const matrixRows = useMemo(() => {
    if (loadState.status !== 'ready') return []
    return buildLiftMatrixRows(loadState.focusMenus, loadState.matrixLift)
  }, [loadState])

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

  if (loadState.status === 'loading' || loadState.status === 'idle') {
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

  if (matrixRows.length < 2) {
    return <p className="text-muted-foreground text-sm">{t('emptyPairLiftMatrixDescription')}</p>
  }

  return (
    <div className="flex flex-col gap-3">
      {loadState.usedFallbackRun ? (
        <p className="text-muted-foreground text-xs">{t('fallbackRunHint')}</p>
      ) : null}
      <div className="overflow-x-auto">
        <HeatmapMatrixEmbedded
          columnLabels={loadState.focusMenus}
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
