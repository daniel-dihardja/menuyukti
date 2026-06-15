'use client'

import { GoogleAnalytics } from '@next/third-parties/google'
import { usePathname, useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useRef } from 'react'

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void
  }
}

function buildPagePath(pathname: string, searchParams: URLSearchParams): string {
  const query = searchParams.toString()
  return query ? `${pathname}?${query}` : pathname
}

function GoogleAnalyticsPageView({ gaId }: { gaId: string }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const isFirstRender = useRef(true)

  useEffect(() => {
    if (pathname == null) return

    const pagePath = buildPagePath(pathname, searchParams)

    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }

    window.gtag?.('config', gaId, { page_path: pagePath })
  }, [gaId, pathname, searchParams])

  return null
}

export function SiteGoogleAnalytics({ gaId }: { gaId: string }) {
  return (
    <>
      <GoogleAnalytics gaId={gaId} />
      <Suspense fallback={null}>
        <GoogleAnalyticsPageView gaId={gaId} />
      </Suspense>
    </>
  )
}
