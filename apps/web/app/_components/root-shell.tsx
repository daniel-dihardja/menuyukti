import { Suspense } from 'react'
import { getLocale, getMessages } from 'next-intl/server'
import { NextIntlClientProvider } from 'next-intl'

import { AppChrome } from '@/components/app-chrome'
import { PwaRegister } from '@/components/pwa-register'
import { Providers } from '@/components/providers'
import { WebVitalsReporter } from '@/components/web-vitals-reporter'

type RootIntlProps = {
  children: React.ReactNode
}

/**
 * Fully static Suspense fallback (Cache Components).
 * Must not use navigation hooks, cookies, or `{children}` — those belong in
 * Suspense-wrapped leaves of the resolved shell.
 */
export function RootIntlFallback() {
  return null
}

export async function RootIntlShell({ children }: RootIntlProps) {
  const messages = await getMessages()
  const locale = await getLocale()
  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <Providers>
        <PwaRegister />
        <Suspense fallback={null}>
          <WebVitalsReporter />
        </Suspense>
        <AppChrome>{children}</AppChrome>
      </Providers>
    </NextIntlClientProvider>
  )
}
