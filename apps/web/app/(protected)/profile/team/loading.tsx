import { getTranslations } from 'next-intl/server'

import { AnalyticsPageShell } from '@/components/analytics-page-shell'
import { routes } from '@/lib/routes'
import { Skeleton } from '@workspace/ui/components/skeleton'

export default async function WorkspaceTeamLoading() {
  const t = await getTranslations('workspaceTeam')
  const profileT = await getTranslations('profile')

  return (
    <AnalyticsPageShell
      title={t('title')}
      breadcrumbs={[
        { label: profileT('breadcrumb'), href: routes.profile },
        { label: t('breadcrumb') },
      ]}
    >
      <div className="space-y-6">
        <Skeleton className="h-8 w-48 max-w-full" />
        <Skeleton className="h-4 w-full max-w-md" />
        <Skeleton className="h-32 w-full max-w-xl" />
        <Skeleton className="h-48 w-full" />
      </div>
    </AnalyticsPageShell>
  )
}
