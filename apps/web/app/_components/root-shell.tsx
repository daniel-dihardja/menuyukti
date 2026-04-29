import { ClerkProvider } from '@clerk/nextjs'
import { getLocale, getMessages } from 'next-intl/server'
import { NextIntlClientProvider } from 'next-intl'

import { AppChrome } from '@/components/app-chrome'
import { Providers } from '@/components/providers'
import { WebVitalsReporter } from '@/components/web-vitals-reporter'
import { routes } from '@/lib/routes'
import enMessages from '@/messages/en.json'

const bodyClassName = (fontSansVar: string, fontMonoVar: string) =>
  `${fontSansVar} ${fontMonoVar} font-sans antialiased `

type RootShellProps = {
  children: React.ReactNode
  fontSansVariable: string
  fontMonoVariable: string
}

/** Static fallback while request locale/messages resolve (Cache Components + next-intl / headers). */
export function RootShellFallback({
  children,
  fontSansVariable,
  fontMonoVariable,
}: RootShellProps) {
  return (
    <body className={bodyClassName(fontSansVariable, fontMonoVariable)}>
      <ClerkProvider
        signInUrl={routes.login}
        signUpUrl={routes.signUp}
        afterSignOutUrl={routes.login}
      >
        <NextIntlClientProvider locale="en" messages={enMessages}>
          <Providers>
            <WebVitalsReporter />
            <AppChrome>{children}</AppChrome>
          </Providers>
        </NextIntlClientProvider>
      </ClerkProvider>
    </body>
  )
}

export async function RootShell({ children, fontSansVariable, fontMonoVariable }: RootShellProps) {
  const messages = await getMessages()
  const locale = await getLocale()
  return (
    <body className={bodyClassName(fontSansVariable, fontMonoVariable)}>
      <ClerkProvider
        signInUrl={routes.login}
        signUpUrl={routes.signUp}
        afterSignOutUrl={routes.login}
      >
        <NextIntlClientProvider locale={locale} messages={messages}>
          <Providers>
            <WebVitalsReporter />
            <AppChrome>{children}</AppChrome>
          </Providers>
        </NextIntlClientProvider>
      </ClerkProvider>
    </body>
  )
}
