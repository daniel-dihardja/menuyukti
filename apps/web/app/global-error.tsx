'use client'

import { Geist, Geist_Mono } from 'next/font/google'

import { ErrorFallback } from '@/components/error-fallback'
import messages from '@/messages/en.json'

const geistSans = Geist({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
})

const geistMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
})

const copy = messages.errorBoundary

export default function RootGlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}>
        <ErrorFallback
          description={copy.description}
          digestLabel={copy.digestLabel}
          error={error}
          reset={reset}
          title={copy.title}
          tryAgainLabel={copy.tryAgain}
        />
      </body>
    </html>
  )
}
