'use client'

import { Button } from '@workspace/ui/components/button'
import { useTranslations } from 'next-intl'

interface EmptyAnalyticsProps {
  onUpload?: () => void
}

export function EmptyAnalytics({ onUpload }: EmptyAnalyticsProps) {
  const t = useTranslations('analytics.sales.noAnalytics')

  return (
    <div className="border rounded-md p-8 text-center space-y-4">
      <h2 className="text-lg font-medium">{t('title')}</h2>
      <p className="text-muted-foreground">{t('description')}</p>
      <Button onClick={onUpload}>{t('cta')}</Button>
    </div>
  )
}
