'use client'

import { GoogleAnalytics } from '@next/third-parties/google'

import { useCookieConsent } from './cookie-consent-context'

/**
 * Mounts `<GoogleAnalytics />` only after the visitor has explicitly accepted analytics.
 * When consent is unknown or rejected we render nothing, so no `gtag.js` request is fired.
 */
export function ConsentGatedGoogleAnalytics({ gaId }: { gaId: string }) {
  const { analyticsGranted } = useCookieConsent()
  if (!analyticsGranted) return null
  return <GoogleAnalytics gaId={gaId} />
}
