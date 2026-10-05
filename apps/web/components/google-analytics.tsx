'use client'

import { GoogleAnalytics } from '@next/third-parties/google'
import { usePathname, useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useRef } from 'react'

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void
  }
}

/** Print shop routes are excluded from GA (no page views or custom events). */
export function isShopAnalyticsPath(pathname: string): boolean {
  return pathname === '/shop' || pathname.startsWith('/shop/')
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
    if (pathname == null || isShopAnalyticsPath(pathname)) return

    const pagePath = buildPagePath(pathname, searchParams)

    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }

    window.gtag?.('config', gaId, { page_path: pagePath })
  }, [gaId, pathname, searchParams])

  return null
}

function SiteGoogleAnalyticsInner({ gaId }: { gaId: string }) {
  const pathname = usePathname()

  if (pathname != null && isShopAnalyticsPath(pathname)) {
    return null
  }

  return (
    <>
      <GoogleAnalytics gaId={gaId} />
      <GoogleAnalyticsPageView gaId={gaId} />
    </>
  )
}

export function SiteGoogleAnalytics({ gaId }: { gaId: string }) {
  return (
    <Suspense fallback={null}>
      <SiteGoogleAnalyticsInner gaId={gaId} />
    </Suspense>
  )
}
