'use client'

import { usePathname } from 'next/navigation'
import { useReportWebVitals } from 'next/web-vitals'

type WebVitalPayload = {
  id: string
  name: string
  value: number
  rating: 'good' | 'needs-improvement' | 'poor'
  path: string
}

const WEB_VITALS_ENABLED = process.env.NEXT_PUBLIC_ENABLE_WEB_VITALS === 'true'

export function WebVitalsReporter() {
  const pathname = usePathname()

  useReportWebVitals((metric) => {
    if (!WEB_VITALS_ENABLED) {
      return
    }
    const payload: WebVitalPayload = {
      id: metric.id,
      name: metric.name,
      value: metric.value,
      rating: metric.rating,
      path: pathname || '/',
    }
    const body = JSON.stringify(payload)
    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/web-vitals', body)
      return
    }
    void fetch('/api/web-vitals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    })
  })

  return null
}
