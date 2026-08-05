'use client'

import { useEffect, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'

import { fetchAnalyticsList, type AnalyticsRunListItem } from '@/lib/api/client-fetch'
import { resolveAnalyticsRunName } from '@/lib/chat/resolve-analytics-run-name'

/** Resolves the display label for a thread's linked sales report (loading / name / fallbacks). */
export function useSalesReportLabel(
  locationId: number | null,
  analyticsRunId: number | null,
): string {
  const t = useTranslations('agentChat')
  const [analyticsRuns, setAnalyticsRuns] = useState<AnalyticsRunListItem[] | null>(null)

  useEffect(() => {
    if (locationId == null) {
      setAnalyticsRuns([])
      return
    }
    let cancelled = false
    setAnalyticsRuns(null)
    void fetchAnalyticsList(locationId)
      .then((runs) => {
        if (cancelled) return
        setAnalyticsRuns(runs)
      })
      .catch(() => {
        if (cancelled) return
        setAnalyticsRuns([])
      })
    return () => {
      cancelled = true
    }
  }, [locationId])

  const salesReportFallbacks = useMemo(
    () => ({
      none: t('noSalesReport'),
      unavailable: t('salesReportUnavailable'),
    }),
    [t],
  )

  if (analyticsRuns === null) {
    return t('salesReportLoading')
  }
  return resolveAnalyticsRunName(analyticsRuns, analyticsRunId, salesReportFallbacks)
}
