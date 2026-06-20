'use client'

import { useAnalyticsActions, useAnalyticsState } from './analytics-provider'

export function useAnalytics() {
  return { ...useAnalyticsState(), ...useAnalyticsActions() }
}
