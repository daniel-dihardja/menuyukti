'use client'

import { useCallback, useEffect, useState } from 'react'

export type AnalyticsListItem = {
  id: number
  name: string
}

export function useLocationAnalytics(locationId: number | null) {
  const [analytics, setAnalytics] = useState<AnalyticsListItem[]>([])
  const [loading, setLoading] = useState(false)

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
    fetchAnalytics()
  }, [fetchAnalytics])

  return {
    analytics,
    loading,
    refetch: fetchAnalytics,
  }
}
