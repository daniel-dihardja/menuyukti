'use client'

import { useContext } from 'react'
import { AnalyticsContext } from './analytics-provider'

export function useAnalytics() {
  const context = useContext(AnalyticsContext)

  if (!context) {
    throw new Error('useAnalytics must be used within an AnalyticsProvider')
  }

  return context
}
