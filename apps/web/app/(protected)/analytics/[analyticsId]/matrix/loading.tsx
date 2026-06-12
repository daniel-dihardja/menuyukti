import { getTranslations } from 'next-intl/server'

import { AnalyticsPageShell } from '@/components/analytics-page-shell'
import { ANALYTICS_REPORT_SHELL_MAIN_CLASS, ANALYTICS_REPORT_SECTION_CLASS } from '@/lib/app-layout'
import { routes } from '@/lib/routes'
import { Skeleton } from '@workspace/ui/components/skeleton'
import { cn } from '@workspace/ui/lib/utils'

export default async function MatrixLoading() {
  const tSales = await getTranslations('analytics.sales')
  const tMatrix = await getTranslations('analytics.matrix')
  const tShared = await getTranslations('analytics.shared')

  return (
    <AnalyticsPageShell
      title={tMatrix('pageLoadingTitle')}
      mainClassName={ANALYTICS_REPORT_SHELL_MAIN_CLASS}
      breadcrumbs={[
        { label: tSales('title'), href: routes.analytics.sales },
        { label: tShared('breadcrumbRunLoading') },
        { label: tMatrix('breadcrumb') },
      ]}
    >
      <section className={cn('flex flex-col gap-6', ANALYTICS_REPORT_SECTION_CLASS)}>
        <div className="flex flex-col gap-2">
          <Skeleton className="h-8 w-80 max-w-full" />
          <Skeleton className="h-4 w-full max-w-2xl" />
          <div className="flex flex-wrap gap-2 pt-1">
            <Skeleton className="h-6 w-24 rounded-full" />
            <Skeleton className="h-6 w-40 rounded-full" />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-9 w-28" />
          <Skeleton className="h-9 w-28" />
          <Skeleton className="h-9 w-44" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={`kpi-${index}`} className="h-36 w-full rounded-lg" />
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={`dist-${index}`} className="h-28 w-full rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-12 w-full max-w-sm rounded-md" />
        <Skeleton className="h-24 w-full rounded-lg" />
        <div className="flex gap-2">
          <Skeleton className="h-9 w-28 rounded-md" />
          <Skeleton className="h-9 w-24 rounded-md" />
        </div>
        <Skeleton className="min-h-[24rem] w-full rounded-lg" />
      </section>
    </AnalyticsPageShell>
  )
}
