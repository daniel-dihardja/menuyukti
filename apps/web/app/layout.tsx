import type { Metadata, Viewport } from 'next'
import { ClerkProvider } from '@clerk/nextjs'
import { Suspense } from 'react'

import '@workspace/ui/globals.css'
import { RootIntlFallback, RootIntlShell } from '@/app/_components/root-shell'
import { fontMono, fontSans } from '@/lib/fonts'
import { routes } from '@/lib/routes'
import { getTranslations } from 'next-intl/server'

const siteUrl = 'https://menuyukti.com'

export const viewport: Viewport = {
  themeColor: '#f8f5f0',
  width: 'device-width',
  initialScale: 1,
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('metadata')

  const title = t('title')
  const description = t('description')
  const ogLocale = t('ogLocale')

  return {
    metadataBase: new URL(siteUrl),
    applicationName: 'Menuyukti',
    title,
    description,
    manifest: '/manifest.webmanifest',
    appleWebApp: {
      capable: true,
      statusBarStyle: 'default',
      title: 'Menuyukti',
    },
    icons: {
      icon: [
        { url: '/favicon.ico', sizes: '32x32', type: 'image/x-icon' },
        { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
        { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      ],
      apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
    },
    openGraph: {
      title,
      description,
      url: siteUrl,
      siteName: 'Menuyukti',
      type: 'website',
      locale: ogLocale,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
    alternates: {
      canonical: siteUrl,
      languages: {
        en: siteUrl,
      },
    },
  }
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head />
      <body className={`${fontSans.variable} ${fontMono.variable} font-sans antialiased `}>
        {/*
          Outer Suspense: Clerk cookie/auth reads (Cache Components).
          Inner Suspense: next-intl getMessages/getLocale.
          ClerkProvider sits between them so it mounts once and does not remount
          when only the intl shell suspends (avoids sign-out state-update races).
        */}
        <Suspense fallback={<RootIntlFallback />}>
          <ClerkProvider
            signInUrl={routes.login}
            signUpUrl={routes.signUp}
            afterSignOutUrl={routes.login}
          >
            <Suspense fallback={<RootIntlFallback />}>
              <RootIntlShell>{children}</RootIntlShell>
            </Suspense>
          </ClerkProvider>
        </Suspense>
      </body>
    </html>
  )
}
