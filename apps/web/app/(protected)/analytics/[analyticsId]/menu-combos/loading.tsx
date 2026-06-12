import { getTranslations } from 'next-intl/server'

import { AnalyticsPageShell } from '@/components/analytics-page-shell'
import { routes } from '@/lib/routes'
import { Skeleton } from '@workspace/ui/components/skeleton'

export default async function MenuCombosLoading() {
  const tSales = await getTranslations('analytics.sales')
  const tMenuCombos = await getTranslations('analytics.menuCombos')
  const tShared = await getTranslations('analytics.shared')

  return (
    <AnalyticsPageShell
      title={tMenuCombos('pageLoadingTitle')}
      breadcrumbs={[
        { label: tSales('title'), href: routes.analytics.sales },
        { label: tShared('breadcrumbRunLoading') },
        { label: tMenuCombos('breadcrumb') },
      ]}
    >
      <section className="flex flex-col gap-6 rounded-xl border border-card-border bg-card p-4 sm:p-6">
        <div className="flex flex-col gap-3">
          <Skeleton className="h-8 w-72 max-w-full" />
          <Skeleton className="h-4 w-full max-w-xl" />
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-6 w-28" />
            <Skeleton className="h-6 w-40" />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-9 w-44" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Skeleton className="h-36 w-full rounded-xl" />
          <Skeleton className="h-36 w-full rounded-xl" />
          <Skeleton className="h-36 w-full rounded-xl" />
          <Skeleton className="h-36 w-full rounded-xl" />
        </div>
        <Skeleton className="h-24 w-full rounded-lg" />
        <Skeleton className="h-10 w-56" />
        <Skeleton className="h-[min(24rem,50vh)] w-full rounded-md" />
      </section>
    </AnalyticsPageShell>
  )
}
