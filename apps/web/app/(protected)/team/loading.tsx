import { getTranslations } from 'next-intl/server'

import { AnalyticsPageShell } from '@/components/analytics-page-shell'
import { routes } from '@/lib/routes'
import { Skeleton } from '@workspace/ui/components/skeleton'

export default async function WorkspaceTeamLoading() {
  const t = await getTranslations('workspaceTeam')

  return (
    <AnalyticsPageShell title={t('title')} breadcrumbs={[{ label: t('title'), href: routes.team }]}>
      <div
        className="flex flex-col gap-6 px-4 py-4 lg:px-6 xl:px-12"
        aria-busy="true"
        aria-label={t('title')}
      >
        <Skeleton className="h-8 w-48 max-w-full" />
        <Skeleton className="h-4 w-full max-w-md" />
        <Skeleton className="h-32 w-full max-w-xl" />
        <Skeleton className="h-48 w-full" />
      </div>
    </AnalyticsPageShell>
  )
}
