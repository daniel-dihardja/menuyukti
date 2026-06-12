import { getTranslations } from 'next-intl/server'

import { AnalyticsPageShell } from '@/components/analytics-page-shell'
import { ANALYTICS_REPORT_SHELL_MAIN_CLASS, ANALYTICS_REPORT_SECTION_CLASS } from '@/lib/app-layout'
import { routes } from '@/lib/routes'
import { Skeleton } from '@workspace/ui/components/skeleton'
import { cn } from '@workspace/ui/lib/utils'

export default async function MenuCombosLoading() {
  const tSales = await getTranslations('analytics.sales')
  const tMenuCombos = await getTranslations('analytics.menuCombos')
  const tShared = await getTranslations('analytics.shared')

  return (
    <AnalyticsPageShell
      title={tMenuCombos('pageLoadingTitle')}
      mainClassName={ANALYTICS_REPORT_SHELL_MAIN_CLASS}
      breadcrumbs={[
        { label: tSales('title'), href: routes.analytics.sales },
        { label: tShared('breadcrumbRunLoading') },
        { label: tMenuCombos('breadcrumb') },
      ]}
    >
      <section className={cn('flex flex-col gap-6', ANALYTICS_REPORT_SECTION_CLASS)}>
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
