import { getTranslations } from 'next-intl/server'

import { AnalyticsPageShell } from '@/components/analytics-page-shell'
import { Skeleton } from '@workspace/ui/components/skeleton'

export default async function DashboardLoading() {
  const t = await getTranslations('platform.dashboard')

  return (
    <AnalyticsPageShell
      mainClassName="gap-0 py-3 sm:py-4"
      title={t('title')}
      breadcrumbs={[{ label: t('title') }]}
    >
      <div className="mx-auto flex w-full max-w-lg flex-col gap-8 sm:max-w-2xl sm:gap-10">
        <div className="space-y-2">
          <Skeleton className="h-7 w-64 max-w-full sm:h-8" />
          <Skeleton className="h-4 w-full max-w-md" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      </div>
    </AnalyticsPageShell>
  )
}
