'use client'

import { useTranslations } from 'next-intl'

import { ErrorFallback } from '@/components/error-fallback'

export default function GlobalError({
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
      digestLabel={t('digestLabel')}
      error={error}
      reset={reset}
      title={t('title')}
      tryAgainLabel={t('tryAgain')}
    />
  )
}
