import { Geist, Geist_Mono } from 'next/font/google'
import type { Metadata } from 'next'
import { Suspense } from 'react'

import '@workspace/ui/globals.css'
import { RootShell, RootShellFallback } from '@/app/_components/root-shell'
import { getTranslations } from 'next-intl/server'

const fontSans = Geist({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans',
})

const fontMono = Geist_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-mono',
})

const ogImageUrl = 'https://menuyukti.com/images/og-image.webp'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('metadata')

  const title = t('title')
  const description = t('description')
  const ogLocale = t('ogLocale')

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: 'https://menuyukti.com',
      siteName: 'Menuyukti',
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
        },
      ],
      type: 'website',
      locale: ogLocale,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImageUrl],
    },
    alternates: {
      canonical: 'https://menuyukti.com',
      languages: {
        en: 'https://menuyukti.com',
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
    <html lang="en" suppressHydrationWarning>
      <Suspense fallback={<RootShellFallback {...shellProps} />}>
        <RootShell {...shellProps} />
      </Suspense>
    </html>
  )
}
