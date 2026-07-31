import { getTranslations } from 'next-intl/server'

import { AnalyticsPageShell } from '@/components/analytics-page-shell'
import { routes } from '@/lib/routes'
import { CONTENT_MEDIA_GRID_CLASS } from '@/app/(protected)/content/_components/content-catalog-types'
import { Skeleton } from '@workspace/ui/components/skeleton'

export default async function MediaLoading() {
  const tMedia = await getTranslations('media')

  return (
    <AnalyticsPageShell
      title={tMedia('title')}
      breadcrumbs={[{ label: tMedia('title'), href: routes.media }]}
      contentWidth="full"
      mainClassName="flex min-h-0 min-h-[24rem] w-full flex-1 flex-col"
    >
      <div className={CONTENT_MEDIA_GRID_CLASS}>
        {Array.from({ length: 6 }, (_, i) => (
          <div
            key={`media-skel-${i}`}
            className="w-full max-w-[11rem] min-w-0 overflow-hidden rounded-xl border border-border/60 bg-muted/40"
          >
            <Skeleton className="aspect-[9/16] w-full" />
            <div className="flex flex-col gap-2 p-2 sm:p-3">
              <Skeleton className="h-3 w-2/3" />
              <Skeleton className="h-2 w-1/3" />
            </div>
          </div>
        ))}
      </div>
    </AnalyticsPageShell>
  )
}
