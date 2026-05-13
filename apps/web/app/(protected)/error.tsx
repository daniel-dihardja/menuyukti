'use client'

import { useTranslations } from 'next-intl'

import { ErrorFallback } from '@/components/error-fallback'

export default function ProtectedError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const t = useTranslations('errorBoundary')

  return (
    <ErrorFallback
      className="flex min-h-[40vh] flex-col items-center justify-center gap-4 p-8"
      description={t('description')}
      digestLabel={t('digestLabel')}
      error={error}
      reset={reset}
      title={t('title')}
      tryAgainLabel={t('tryAgain')}
    />
  )
}
