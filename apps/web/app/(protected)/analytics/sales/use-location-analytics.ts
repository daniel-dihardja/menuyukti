'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

export type AnalyticsListItem = {
  id: number
  name: string
}

export function useLocationAnalytics(
  locationId: number | null,
  options?: { initialLocationId?: number | null; initialAnalytics?: AnalyticsListItem[] },
) {
  const initialLocationId = options?.initialLocationId ?? null
  const initialAnalytics = options?.initialAnalytics ?? []
  const [analytics, setAnalytics] = useState<AnalyticsListItem[]>(initialAnalytics)
  const [loading, setLoading] = useState(false)
  const hydratedRef = useRef(false)

  const fetchAnalytics = useCallback(async () => {
    if (!locationId) {
      setAnalytics([])
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`/api/analytics/list?locationId=${locationId}`)
      const body = await res.json()
      if (!res.ok) {
        const message = (body?.error as string) || 'Failed to load analytics'
        throw new Error(message)
      }
      const data = body as AnalyticsListItem[]
      setAnalytics(data)
    } catch (err) {
      console.error('Failed to fetch analytics:', err)
      setAnalytics([])
    } finally {
      setLoading(false)
    }
  }, [locationId])

  useEffect(() => {
    if (!hydratedRef.current && locationId === initialLocationId && initialAnalytics.length > 0) {
      hydratedRef.current = true
      return
    }
    fetchAnalytics()
  }, [fetchAnalytics, initialAnalytics.length, initialLocationId, locationId])

  return {
    analytics,
    loading,
    refetch: fetchAnalytics,
  }
}
