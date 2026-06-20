import { getTranslations } from 'next-intl/server'

import { AnalyticsPageShell } from '@/components/analytics-page-shell'
import { Skeleton } from '@workspace/ui/components/skeleton'

export default async function UsageLoading() {
  const t = await getTranslations('usage')

  return (
    <AnalyticsPageShell title={t('title')} breadcrumbs={[{ label: t('breadcrumb') }]}>
      <div className="flex flex-col gap-6">
        <Skeleton className="h-8 w-64 max-w-full" />
        <Skeleton className="h-4 w-full max-w-xl" />
        <Skeleton className="h-4 w-64" />
        <div className="grid gap-3 sm:grid-cols-2">
          <Skeleton className="h-24 w-full rounded-lg" />
          <Skeleton className="h-24 w-full rounded-lg" />
        </div>
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    </AnalyticsPageShell>
  )
}
