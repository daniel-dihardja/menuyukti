import { getTranslations } from 'next-intl/server'

import { AnalyticsPageShell } from '@/components/analytics-page-shell'
import { routes } from '@/lib/routes'
import { Skeleton } from '@workspace/ui/components/skeleton'

export default async function HeatmapLoading() {
  const tSales = await getTranslations('analytics.sales')
  const tHeatmap = await getTranslations('analytics.heatmap')
  const tShared = await getTranslations('analytics.shared')

  return (
    <AnalyticsPageShell
      title={tHeatmap('pageLoadingTitle')}
      breadcrumbs={[
        { label: tSales('title'), href: routes.analytics.sales },
        { label: tShared('breadcrumbRunLoading') },
        { label: tHeatmap('breadcrumb') },
      ]}
    >
      <section className="flex flex-col gap-4 rounded-md border p-6">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-8 w-72 max-w-full" />
          <Skeleton className="h-4 w-full max-w-xl" />
        </div>
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-9 w-44" />
        </div>
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-8 w-52" />
        </div>
        <Skeleton className="h-10 w-full max-w-sm" />
        <div className="flex flex-wrap gap-3">
          <Skeleton className="h-6 w-36" />
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-6 w-28" />
        </div>
        <Skeleton className="h-[min(28rem,55vh)] w-full rounded-md" />
      </section>
    </AnalyticsPageShell>
  )
}
