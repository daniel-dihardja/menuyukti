'use client'

import { useCallback, useState } from 'react'

type UseDeleteAnalyticsArgs = {
  locationId: number | null
  onSuccess: () => void
}

export function useDeleteAnalytics({ locationId, onSuccess }: UseDeleteAnalyticsArgs) {
  const [deleting, setDeleting] = useState(false)

  const deleteAnalytics = useCallback(
    async (analyticsId: number): Promise<{ ok: true } | { ok: false }> => {
      if (!locationId) return { ok: false }

      setDeleting(true)
      try {
        const res = await fetch('/api/analytics/delete', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            analyticsId,
            locationId,
          }),
        })

        if (!res.ok) {
          const text = await res.text().catch(() => '')
          let errData: { error?: string } | null = null
          try {
            errData = text ? (JSON.parse(text) as { error?: string }) : null
          } catch {
            errData = null
          }
          console.error('Delete analytics failed:', errData?.error || res.status)
          return { ok: false }
        }

        onSuccess()
        return { ok: true }
      } catch (err) {
        console.error('Delete analytics failed:', err)
        return { ok: false }
      } finally {
        setDeleting(false)
      }
    },
    [locationId, onSuccess],
  )

  return {
    deleteAnalytics,
    deleting,
  }
}
