'use client'

import * as React from 'react'
import { ThemeProvider } from 'next-themes'
import { NuqsAdapter } from 'nuqs/adapters/next/app'

import { CookieConsentBanner } from '@/components/cookie-consent/cookie-consent-banner'
import { CookieConsentProvider } from '@/components/cookie-consent/cookie-consent-context'
import { StylePaletteProvider } from '@/components/style-palette-provider'
import { Toaster } from '@/components/toaster'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <NuqsAdapter>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
        <StylePaletteProvider>
          <CookieConsentProvider>
            {children}
            <Toaster />
            <CookieConsentBanner />
          </CookieConsentProvider>
        </StylePaletteProvider>
      </ThemeProvider>
    </NuqsAdapter>
  )
}
