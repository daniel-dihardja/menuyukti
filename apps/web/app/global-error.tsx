'use client'

import { ErrorFallback } from '@/components/error-fallback'
import { fontMono, fontSans } from '@/lib/fonts'
import errorBoundaryMessages from '@/messages/en/errorBoundary.json'

const copy = errorBoundaryMessages.errorBoundary

export default function RootGlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="en">
      <body className={`${fontSans.variable} ${fontMono.variable} font-sans antialiased`}>
        <ErrorFallback
          description={copy.description}
          digestLabel={
            error.digest ? copy.digestLabel.replace('{digest}', error.digest) : undefined
          }
          error={error}
          reset={reset}
          title={copy.title}
          tryAgainLabel={copy.tryAgain}
        />
      </body>
    </html>
  )
}
