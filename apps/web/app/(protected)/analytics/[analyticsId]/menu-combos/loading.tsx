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
      mainClassName="gap-4 px-0 py-0 sm:gap-6 sm:px-6 sm:py-4 md:px-12"
      breadcrumbs={[
        { label: tSales('title'), href: routes.analytics.sales },
        { label: tShared('breadcrumbRunLoading') },
        { label: tMenuCombos('breadcrumb') },
      ]}
    >
      <section className="flex flex-col gap-6 rounded-none border-0 bg-transparent p-4 sm:rounded-xl sm:border sm:border-card-border sm:bg-card sm:p-6">
        <div className="flex flex-col gap-3">
          <Skeleton className="h-8 w-72 max-w-full" />
          <Skeleton className="h-4 w-full max-w-xl" />
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-6 w-28" />
            <Skeleton className="h-6 w-40" />
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Skeleton className="h-9 w-full sm:w-32" />
          <Skeleton className="h-9 w-full sm:w-44" />
        </div>

        <Skeleton className="h-44 w-full rounded-xl" />

        <div className="-mx-1 flex gap-3 overflow-hidden px-1">
          <Skeleton className="h-28 min-w-[72%] shrink-0 rounded-xl" />
          <Skeleton className="h-28 min-w-[72%] shrink-0 rounded-xl" />
        </div>

        <div className="grid w-full grid-cols-2 gap-2">
          <Skeleton className="h-10 w-full rounded-md" />
          <Skeleton className="h-10 w-full rounded-md" />
        </div>

        <div className="flex flex-col gap-3">
          <Skeleton className="h-10 w-full rounded-md" />
          <Skeleton className="h-10 w-full rounded-md" />
          <Skeleton className="h-32 w-full rounded-lg" />
          <Skeleton className="h-32 w-full rounded-lg" />
        </div>

        <Skeleton className="h-24 w-full rounded-lg" />
        <Skeleton className="h-9 w-full rounded-md md:w-40" />
      </section>
    </AnalyticsPageShell>
  )
}
