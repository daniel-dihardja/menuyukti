import { getTranslations } from 'next-intl/server'

import { AnalyticsPageShell } from '@/components/analytics-page-shell'
import { routes } from '@/lib/routes'
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
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={`media-skel-${i}`} className="aspect-[4/3] w-full rounded-xl" />
        ))}
      </div>
    </AnalyticsPageShell>
  )
}
