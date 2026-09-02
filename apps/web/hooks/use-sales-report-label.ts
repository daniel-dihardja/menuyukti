'use client'

import { useMemo } from 'react'
import { useTranslations } from 'next-intl'

import { useAnalyticsList } from '@/hooks/use-analytics-list'
import { resolveAnalyticsRunName } from '@/lib/chat/resolve-analytics-run-name'

/** Resolves the display label for a thread's linked sales report (loading / name / fallbacks). */
export function useSalesReportLabel(
  locationId: number | null,
  analyticsRunId: number | null,
): string {
  const t = useTranslations('agentChat')
  const { runs, isLoading } = useAnalyticsList(locationId)

  const salesReportFallbacks = useMemo(
    () => ({
      none: t('noSalesReport'),
      unavailable: t('salesReportUnavailable'),
    }),
    [t],
  )

  if (locationId != null && isLoading) {
    return t('salesReportLoading')
  }
  return resolveAnalyticsRunName(runs, analyticsRunId, salesReportFallbacks)
}
