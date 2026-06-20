import { getTranslations } from 'next-intl/server'

import { AnalyticsPageShell } from '@/components/analytics-page-shell'
import { routes } from '@/lib/routes'
import { Skeleton } from '@workspace/ui/components/skeleton'

export default async function PhotosLoading() {
  const tSidebar = await getTranslations('sidebar')
  const tPhotos = await getTranslations('photos')

  return (
    <AnalyticsPageShell
      title={tPhotos('title')}
      breadcrumbs={[
        { label: tSidebar('content'), href: routes.content.photos },
        { label: tSidebar('photos'), href: routes.content.photos },
      ]}
      contentWidth="full"
      mainClassName="flex min-h-0 min-h-[24rem] w-full flex-1 flex-col"
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={`photo-skel-${i}`} className="aspect-[4/3] w-full rounded-xl" />
        ))}
      </div>
    </AnalyticsPageShell>
  )
}
