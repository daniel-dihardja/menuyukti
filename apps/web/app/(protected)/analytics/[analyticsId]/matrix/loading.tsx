import { getTranslations } from 'next-intl/server'

import { AnalyticsPageShell } from '@/components/analytics-page-shell'
import { routes } from '@/lib/routes'
import { Skeleton } from '@workspace/ui/components/skeleton'

export default async function MatrixLoading() {
  const tSales = await getTranslations('analytics.sales')
  const tMatrix = await getTranslations('analytics.matrix')
  const tShared = await getTranslations('analytics.shared')

  return (
    <AnalyticsPageShell
      title={tMatrix('pageLoadingTitle')}
      breadcrumbs={[
        { label: tSales('title'), href: routes.analytics.sales },
        { label: tShared('breadcrumbRunLoading') },
        { label: tMatrix('breadcrumb') },
      ]}
    >
      <section className="space-y-4 rounded-md border p-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-80 max-w-full" />
          <Skeleton className="h-4 w-full max-w-2xl" />
        </div>
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-9 w-44" />
        </div>
        <Skeleton className="h-12 w-full rounded-md" />
        <Skeleton className="min-h-[18rem] w-full rounded-md" />
      </section>
    </AnalyticsPageShell>
  )
}
