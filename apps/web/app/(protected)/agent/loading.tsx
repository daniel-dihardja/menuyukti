import { getTranslations } from 'next-intl/server'

import { AnalyticsPageShell } from '@/components/analytics-page-shell'
import { routes } from '@/lib/routes'
import { Skeleton } from '@workspace/ui/components/skeleton'

export default async function AgentLoading() {
  const t = await getTranslations('agentChat')
  const tDash = await getTranslations('platform.dashboard')

  return (
    <AnalyticsPageShell
      breadcrumbs={[{ label: tDash('title'), href: routes.dashboard }, { label: t('metaTitle') }]}
      title={t('metaTitle')}
    >
      <div className="flex min-h-[400px] flex-col gap-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="min-h-[280px] flex-1 rounded-lg" />
        <Skeleton className="h-12 w-full" />
      </div>
    </AnalyticsPageShell>
  )
}
