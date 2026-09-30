'use client'

import { useState } from 'react'

export type ImportPosStatus = 'idle' | 'success' | 'error'

export type ImportPosResult = {
  analyticsRunId: number
  name: string
  orderCount: number
  lineCount: number
}

export function useImportPosAnalytics(locationId: number | null, onSuccess?: () => void) {
  const [importing, setImporting] = useState(false)
  const [status, setStatus] = useState<ImportPosStatus>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [result, setResult] = useState<ImportPosResult | null>(null)

  async function importPos(startDate: string, endDate: string): Promise<boolean> {
    if (!locationId) {
      setStatus('error')
      setErrorMessage('missingLocation')
      setResult(null)
      return false
    }
    if (!startDate || !endDate) {
      setStatus('error')
      setErrorMessage('missingDates')
      setResult(null)
      return false
    }
    if (startDate > endDate) {
      setStatus('error')
      setErrorMessage('invalidRange')
      setResult(null)
      return false
    }

    setImporting(true)
    setStatus('idle')
    setErrorMessage(null)
    setResult(null)

    try {
      const res = await fetch('/api/analytics/import-pos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locationId, startDate, endDate }),
      })

      const text = await res.text().catch(() => '')
      let payload: (ImportPosResult & { error?: string }) | null = null
      try {
        payload = text ? (JSON.parse(text) as ImportPosResult & { error?: string }) : null
      } catch {
        payload = null
      }

      if (!res.ok) {
        throw new Error(payload?.error || `Import failed (${res.status})`)
      }
      if (!payload?.analyticsRunId) {
        throw new Error('Import failed')
      }

      setStatus('success')
      setResult({
        analyticsRunId: payload.analyticsRunId,
        name: payload.name,
        orderCount: payload.orderCount,
        lineCount: payload.lineCount,
      })
      onSuccess?.()
      return true
    } catch (err) {
      console.error('POS import error:', err)
      setStatus('error')
      setErrorMessage(err instanceof Error ? err.message : 'Import failed')
      setResult(null)
      return false
    } finally {
      setImporting(false)
    }
  }

  return {
    importPos,
    importing,
    status,
    errorMessage,
    result,
  }
}
