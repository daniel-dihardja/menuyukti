import { getTranslations } from 'next-intl/server'

import { AnalyticsPageShell } from '@/components/analytics-page-shell'
import { routes } from '@/lib/routes'
import { Skeleton } from '@workspace/ui/components/skeleton'

export default async function ReelsLoading() {
  const tSidebar = await getTranslations('sidebar')
  const tReels = await getTranslations('reels')

  return (
    <AnalyticsPageShell
      title={tReels('title')}
      breadcrumbs={[
        { label: tSidebar('content'), href: routes.content.photos },
        { label: tSidebar('igReels'), href: routes.content.reels },
      ]}
      contentWidth="full"
      mainClassName="flex min-h-0 min-h-[24rem] w-full flex-1 flex-col"
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={`reel-skel-${i}`} className="aspect-[9/16] w-full rounded-xl" />
        ))}
      </div>
    </AnalyticsPageShell>
  )
}
