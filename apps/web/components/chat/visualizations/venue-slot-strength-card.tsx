'use client'

import { useCallback, useEffect, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'

import { OrderMetricsVenueHeatmap } from '@/app/(protected)/analytics/[analyticsId]/order-metrics/_components/order-metrics-venue-heatmap'
import type { SlotDemandCell } from '@/lib/graphql/queries/analytics'
import { Alert, AlertDescription, AlertTitle } from '@workspace/ui/components/alert'
import { Button } from '@workspace/ui/components/button'
import { Skeleton } from '@workspace/ui/components/skeleton'

type LoadState =
  | { status: 'idle' }
  | { status: 'loading' }
  | {
      status: 'ready'
      slotDemandProfile: SlotDemandCell[]
      usedFallbackRun: boolean
    }
  | { status: 'error' }

type VenueSlotStrengthCardProps = {
  locationId: number
  analyticsRunId: number | null
}

export function VenueSlotStrengthCard({ locationId, analyticsRunId }: VenueSlotStrengthCardProps) {
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
      const res = await fetch(`/api/analytics/order-metrics?${params.toString()}`, {
        cache: 'no-store',
      })
      if (!res.ok) {
        throw new Error('fetch failed')
      }
      const body = (await res.json()) as {
        slotDemandProfile?: SlotDemandCell[]
        usedFallbackRun?: boolean
      }
      setLoadState({
        status: 'ready',
        slotDemandProfile: Array.isArray(body.slotDemandProfile) ? body.slotDemandProfile : [],
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
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-3 w-full max-w-sm" />
        <div className="grid grid-cols-4 gap-1">
          {Array.from({ length: 12 }, (_, i) => (
            <Skeleton className="h-8 rounded-sm" key={`heatmap-skeleton-${i}`} />
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

  if (loadState.slotDemandProfile.length === 0) {
    return <p className="text-muted-foreground text-sm">{t('emptyDataDescription')}</p>
  }

  return (
    <div className="flex flex-col gap-3">
      {loadState.usedFallbackRun ? (
        <p className="text-muted-foreground text-xs">{t('fallbackRunHint')}</p>
      ) : null}
      <div className="overflow-x-auto">
        <OrderMetricsVenueHeatmap locale={locale} slotDemandProfile={loadState.slotDemandProfile} />
      </div>
    </div>
  )
}
