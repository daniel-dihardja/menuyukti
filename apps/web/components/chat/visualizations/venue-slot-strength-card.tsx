'use client'

import { useLocale, useTranslations } from 'next-intl'
import useSWR from 'swr'

import { OrderMetricsVenueHeatmap } from '@/app/(protected)/analytics/[analyticsId]/order-metrics/_components/order-metrics-venue-heatmap'
import type { SlotDemandCell } from '@/lib/graphql/queries/analytics'
import { Alert, AlertDescription, AlertTitle } from '@workspace/ui/components/alert'
import { Button } from '@workspace/ui/components/button'
import { Skeleton } from '@workspace/ui/components/skeleton'

import { chatVizJsonFetcher, chatVizQueryUrl } from './chat-viz-fetcher'

type OrderMetricsResponse = {
  slotDemandProfile?: SlotDemandCell[]
  usedFallbackRun?: boolean
}

type VenueSlotStrengthCardProps = {
  locationId: number
  analyticsRunId: number | null
}

export function VenueSlotStrengthCard({ locationId, analyticsRunId }: VenueSlotStrengthCardProps) {
  const locale = useLocale()
  const t = useTranslations('chat.visualizations')
  const url = chatVizQueryUrl('/api/analytics/order-metrics', locationId, analyticsRunId)
  const { data, error, isLoading, mutate } = useSWR(url, chatVizJsonFetcher<OrderMetricsResponse>, {
    revalidateOnFocus: false,
  })

  if (isLoading || (!data && !error)) {
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

  const slotDemandProfile = Array.isArray(data.slotDemandProfile) ? data.slotDemandProfile : []
  const usedFallbackRun = data.usedFallbackRun === true

  if (slotDemandProfile.length === 0) {
    return <p className="text-muted-foreground text-sm">{t('emptyDataDescription')}</p>
  }

  return (
    <div className="flex flex-col gap-3">
      {usedFallbackRun ? (
        <p className="text-muted-foreground text-xs">{t('fallbackRunHint')}</p>
      ) : null}
      <div className="overflow-x-auto">
        <OrderMetricsVenueHeatmap locale={locale} slotDemandProfile={slotDemandProfile} />
      </div>
    </div>
  )
}
