// use-delete-analytics.ts
'use client'

type UseDeleteAnalyticsArgs = {
  locationId: number | null
  onSuccess: () => void
}

export function useDeleteAnalytics({ locationId, onSuccess }: UseDeleteAnalyticsArgs) {
  async function deleteAnalytics(analyticsId: number) {
    if (!locationId) return

    const confirmed = confirm(
      'Delete this analytics report? This action cannot be undone and will remove related generated insights.',
    )
    if (!confirmed) return

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
        throw new Error(errData?.error || `Failed to delete analytics (${res.status})`)
      }

      onSuccess()
    } catch (err) {
      console.error('Delete analytics failed:', err)
      alert(
        'Could not delete the analytics report. Please retry, and refresh the page if the problem persists.',
      )
    }
  }

  return {
    deleteAnalytics,
  }
}
