'use client'

import useSWR from 'swr'

import { fetchAnalyticsList, type AnalyticsRunListItem } from '@/lib/api/client-fetch'

export function analyticsListKey(locationId: number | null | undefined) {
  return locationId == null ? null : (['analytics-list', locationId] as const)
}

async function analyticsListFetcher([, locationId]: readonly [
  'analytics-list',
  number,
]): Promise<AnalyticsRunListItem[]> {
  return fetchAnalyticsList(locationId)
}

export type UseAnalyticsListOptions = {
  /** Seed from RSC when the key matches the server-fetched location. */
  fallbackData?: AnalyticsRunListItem[]
}

/** Shared SWR cache for `/api/analytics/list` across breadcrumb, composer, and thread list. */
export function useAnalyticsList(
  locationId: number | null | undefined,
  options?: UseAnalyticsListOptions,
) {
  const { data, error, isLoading, isValidating, mutate } = useSWR(
    analyticsListKey(locationId),
    analyticsListFetcher,
    {
      revalidateOnFocus: false,
      ...(options?.fallbackData !== undefined ? { fallbackData: options.fallbackData } : {}),
    },
  )

  return {
    runs: data ?? [],
    error,
    isLoading: Boolean(locationId != null && data === undefined && isLoading),
    isValidating,
    mutate,
  }
}
