import { ClerkProvider } from '@clerk/nextjs'
import { Geist, Geist_Mono } from 'next/font/google'
import type { Metadata } from 'next'

import '@workspace/ui/globals.css'
import { AppChrome } from '@/components/app-chrome'
import { Providers } from '@/components/providers'
import { routes } from '@/lib/routes'
import { getLocale, getMessages, getTranslations } from 'next-intl/server'
import { NextIntlClientProvider } from 'next-intl'

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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const messages = await getMessages()
  const locale = await getLocale()
  return (
    <html lang={locale} suppressHydrationWarning>
      <body className={`${fontSans.variable} ${fontMono.variable} font-sans antialiased `}>
        <ClerkProvider
          signInUrl={routes.login}
          signUpUrl={routes.signUp}
          afterSignOutUrl={routes.login}
        >
          <NextIntlClientProvider locale={locale} messages={messages}>
            <Providers>
              <AppChrome>{children}</AppChrome>
            </Providers>
          </NextIntlClientProvider>
        </ClerkProvider>
      </body>
    </html>
  )
}
