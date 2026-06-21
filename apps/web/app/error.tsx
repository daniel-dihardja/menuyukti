'use client'

import { useTranslations } from 'next-intl'

import { ErrorFallback } from '@/components/error-fallback'

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const t = useTranslations('errorBoundary')

  return (
    <ErrorFallback
      description={t('description')}
      digestLabel={error.digest ? t('digestLabel', { digest: error.digest }) : undefined}
      error={error}
      reset={reset}
      title={t('title')}
      tryAgainLabel={t('tryAgain')}
    />
  )
}
