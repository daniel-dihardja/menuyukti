import { getTranslations } from 'next-intl/server'

import { AnalyticsPageShell } from '@/components/analytics-page-shell'
import { routes } from '@/lib/routes'
import { Skeleton } from '@workspace/ui/components/skeleton'

export default async function CanvasLoading() {
  const tStudio = await getTranslations('sidebar')

  return (
    <AnalyticsPageShell
      title={tStudio('studio')}
      breadcrumbs={[{ label: tStudio('studio'), href: routes.canvas }]}
      contentWidth="full"
      mainClassName="flex min-h-0 min-h-[24rem] w-full flex-1 flex-col"
    >
      <div className="flex w-full flex-col gap-6">
        <div className="rounded-xl border-2 border-dashed border-muted-foreground/25 bg-muted/20 px-4 py-8 sm:px-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="flex flex-1 flex-col gap-3">
              <div className="flex items-start gap-3">
                <Skeleton className="h-10 w-10 shrink-0 rounded-xl" />
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <Skeleton className="h-5 w-48 max-w-full" />
                  <Skeleton className="h-4 w-full max-w-xl" />
                </div>
              </div>
              <Skeleton className="h-10 w-full max-w-md" />
            </div>
            <Skeleton className="h-10 w-full shrink-0 rounded-full sm:w-36" />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 sm:gap-4">
          {Array.from({ length: 8 }, (_, i) => (
            <div
              key={`studio-grid-skel-${i}`}
              className="min-w-0 overflow-hidden rounded-xl border border-border/60 bg-muted/40"
            >
              <Skeleton className="aspect-[4/3]" />
              <div className="flex flex-col gap-2 p-3">
                <Skeleton className="h-3 w-2/3" />
                <Skeleton className="h-2 w-1/3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </AnalyticsPageShell>
  )
}
