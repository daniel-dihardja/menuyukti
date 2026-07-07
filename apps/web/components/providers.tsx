'use client'

import * as React from 'react'
import { NuqsAdapter } from 'nuqs/adapters/next/app'

import { CookieConsentBanner } from '@/components/cookie-consent/cookie-consent-banner'
import { CookieConsentProvider } from '@/components/cookie-consent/cookie-consent-context'
import { SiteGoogleAnalytics } from '@/components/google-analytics'
import { Toaster } from '@/components/toaster'

const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <NuqsAdapter>
      <CookieConsentProvider>
        {GA_MEASUREMENT_ID ? <SiteGoogleAnalytics gaId={GA_MEASUREMENT_ID} /> : null}
        {children}
        <Toaster />
        <CookieConsentBanner />
      </CookieConsentProvider>
    </NuqsAdapter>
  )
}
