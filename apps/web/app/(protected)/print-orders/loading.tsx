import { getTranslations } from 'next-intl/server'

import { AnalyticsPageShell } from '@/components/analytics-page-shell'
import { Skeleton } from '@workspace/ui/components/skeleton'

export default async function PrintOrdersLoading() {
  const t = await getTranslations('platform.printOrders')

  return (
    <AnalyticsPageShell title={t('pageLoadingTitle')} breadcrumbs={[{ label: t('title') }]}>
      <div className="space-y-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-56 max-w-full" />
          <Skeleton className="h-4 w-full max-w-xl" />
        </div>
        <Skeleton className="h-48 w-full max-w-md rounded-lg" />
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <li key={`print-preview-skel-${i}`}>
              <Skeleton className="aspect-[4/3] w-full rounded-lg" />
            </li>
          ))}
        </ul>
      </div>
    </AnalyticsPageShell>
  )
}
