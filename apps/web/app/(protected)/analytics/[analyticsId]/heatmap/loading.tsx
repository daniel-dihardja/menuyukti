import { getTranslations } from 'next-intl/server'

import { AnalyticsPageShell } from '@/components/analytics-page-shell'
import { ANALYTICS_REPORT_SHELL_MAIN_CLASS, ANALYTICS_REPORT_SECTION_CLASS } from '@/lib/app-layout'
import { routes } from '@/lib/routes'
import { Skeleton } from '@workspace/ui/components/skeleton'
import { cn } from '@workspace/ui/lib/utils'

export default async function HeatmapLoading() {
  const tSales = await getTranslations('analytics.sales')
  const tHeatmap = await getTranslations('analytics.heatmap')
  const tShared = await getTranslations('analytics.shared')

  return (
    <AnalyticsPageShell
      title={tHeatmap('pageLoadingTitle')}
      mainClassName={ANALYTICS_REPORT_SHELL_MAIN_CLASS}
      breadcrumbs={[
        { label: tSales('title'), href: routes.analytics.sales },
        { label: tShared('breadcrumbRunLoading') },
        { label: tHeatmap('breadcrumb') },
      ]}
    >
      <section className={cn('flex flex-col gap-4', ANALYTICS_REPORT_SECTION_CLASS)}>
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
