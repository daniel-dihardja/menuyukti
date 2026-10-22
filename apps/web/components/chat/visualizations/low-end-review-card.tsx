'use client'

import { useLocale, useTranslations } from 'next-intl'
import useSWR from 'swr'

import { LowEndView } from '@/components/analytics/low-end/low-end-view'
import { getAppCurrencyCode } from '@/lib/app-currency'
import type { MenuEngineeringMatrixData } from '@/lib/graphql/queries/analytics'
import { Alert, AlertDescription, AlertTitle } from '@workspace/ui/components/alert'
import { Button } from '@workspace/ui/components/button'
import { Skeleton } from '@workspace/ui/components/skeleton'

import { chatVizJsonFetcher, chatVizQueryUrl } from './chat-viz-fetcher'

type MatrixItem = NonNullable<MenuEngineeringMatrixData['menuEngineeringMatrix']>['items'][number]
type DistributionItem = NonNullable<
  MenuEngineeringMatrixData['menuEngineeringMatrix']
>['distribution'][number]

type LowEndResponse = {
  items?: MatrixItem[]
  distribution?: DistributionItem[]
  periodStart?: string | null
  periodEnd?: string | null
  usedFallbackRun?: boolean
}

type LowEndReviewCardProps = {
  locationId: number
  analyticsRunId: number | null
}

export function LowEndReviewCard({ locationId, analyticsRunId }: LowEndReviewCardProps) {
  const locale = useLocale()
  const t = useTranslations('chat.visualizations')
  const currency = getAppCurrencyCode()
  const url = chatVizQueryUrl('/api/analytics/low-end', locationId, analyticsRunId)
  const { data, error, isLoading, mutate } = useSWR(url, chatVizJsonFetcher<LowEndResponse>, {
    revalidateOnFocus: false,
  })

  if (isLoading || (!data && !error)) {
    return (
      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton className="h-24 w-full rounded-lg" key={`low-end-kpi-${i}`} />
          ))}
        </div>
        <Skeleton className="h-28 w-full rounded-lg" />
        <Skeleton className="min-h-48 w-full rounded-lg" />
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

  const items = Array.isArray(data.items) ? data.items : []
  const distribution = Array.isArray(data.distribution) ? data.distribution : []
  const usedFallbackRun = data.usedFallbackRun === true

  if (items.length === 0) {
    return <p className="text-muted-foreground text-sm">{t('emptyLowEndDescription')}</p>
  }

  return (
    <div className="flex flex-col gap-3">
      {usedFallbackRun ? (
        <p className="text-muted-foreground text-xs">{t('fallbackRunHint')}</p>
      ) : null}
      <LowEndView
        currency={currency}
        distribution={distribution}
        items={items}
        locale={locale}
        periodEnd={data.periodEnd ?? null}
        periodStart={data.periodStart ?? null}
      />
    </div>
  )
}
