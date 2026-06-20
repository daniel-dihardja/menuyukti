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
      <div className="mx-auto flex w-full max-w-lg flex-col gap-5 sm:max-w-2xl sm:gap-6">
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    </AnalyticsPageShell>
  )
}
