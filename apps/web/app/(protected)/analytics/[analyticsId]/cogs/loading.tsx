import { getTranslations } from 'next-intl/server'

import { AnalyticsPageShell } from '@/components/analytics-page-shell'
import { routes } from '@/lib/routes'
import { Skeleton } from '@workspace/ui/components/skeleton'

export default async function CogsLoading() {
  const tSales = await getTranslations('analytics.sales')
  const tCogs = await getTranslations('analytics.cogs')
  const tShared = await getTranslations('analytics.shared')

  return (
    <AnalyticsPageShell
      title={tCogs('pageLoadingTitle')}
      breadcrumbs={[
        { label: tSales('title'), href: routes.analytics.sales },
        { label: tShared('breadcrumbRunLoading') },
        { label: tCogs('title') },
      ]}
    >
      <div className="space-y-4">
        <Skeleton className="h-6 w-56 max-w-full" />
        <Skeleton className="h-4 w-full max-w-lg" />
        <Skeleton className="min-h-[20rem] w-full rounded-md" />
      </div>
    </AnalyticsPageShell>
  )
}
