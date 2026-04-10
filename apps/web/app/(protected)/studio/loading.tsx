import { getTranslations } from 'next-intl/server'

import { AnalyticsPageShell } from '@/components/analytics-page-shell'
import { routes } from '@/lib/routes'
import { Skeleton } from '@workspace/ui/components/skeleton'

export default async function StudioLoading() {
  const tImageFlows = await getTranslations('imageFlows')
  const tStudio = await getTranslations('sidebar')

  return (
    <AnalyticsPageShell
      title={tImageFlows('pageLoadingTitle')}
      breadcrumbs={[{ label: tStudio('studio'), href: routes.studio }]}
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48 max-w-full" />
          <Skeleton className="h-4 w-full max-w-xl" />
        </div>
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-9 w-28" />
          <Skeleton className="h-9 w-32" />
        </div>
        <ul className="grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 4 }, (_, i) => (
            <li key={`studio-skel-${i}`}>
              <Skeleton className="h-24 w-full rounded-lg" />
            </li>
          ))}
        </ul>
      </div>
    </AnalyticsPageShell>
  )
}
