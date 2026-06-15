import { Geist_Mono, Plus_Jakarta_Sans } from 'next/font/google'
import type { Metadata, Viewport } from 'next'
import { Suspense } from 'react'

import '@workspace/ui/globals.css'
import { RootShell, RootShellFallback } from '@/app/_components/root-shell'
import { stylePaletteScript } from '@/lib/style-palette'
import { getTranslations } from 'next-intl/server'

const fontSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans',
  weight: ['400', '500', '600', '700', '800'],
})

const fontMono = Geist_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-mono',
})

const siteUrl = 'https://menuyukti.com'

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#fdf8f2' },
    { media: '(prefers-color-scheme: dark)', color: '#2b241c' },
  ],
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
  const shellProps = {
    fontSansVariable: fontSans.variable,
    fontMonoVariable: fontMono.variable,
    children,
  }
  return (
    <html lang="en" suppressHydrationWarning data-palette="espresso">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: stylePaletteScript(),
          }}
        />
      </head>
      <Suspense fallback={<RootShellFallback {...shellProps} />}>
        <RootShell {...shellProps} />
      </Suspense>
    </html>
  )
}
