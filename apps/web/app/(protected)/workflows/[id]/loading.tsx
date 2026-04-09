import { getTranslations } from 'next-intl/server'
import { AnalyticsPageShell } from '@/components/analytics-page-shell'
import { routes } from '@/lib/routes'
import { Skeleton } from '@workspace/ui/components/skeleton'

export default async function CampaignDetailLoading() {
  const tCampaigns = await getTranslations('analytics.campaigns')
  const tChat = await getTranslations('analytics.campaigns.chat')
  const title = tChat('pageLoadingTitle')

  return (
    <AnalyticsPageShell
      title={title}
      breadcrumbs={[{ label: tCampaigns('title'), href: routes.workflows.list }, { label: title }]}
      mainClassName="max-w-none flex min-h-0 min-h-[24rem] w-full flex-1 flex-col"
    >
      <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4">
        <Skeleton className="h-8 w-48 max-w-full" />
        <div className="grid min-h-0 min-w-0 flex-1 grid-cols-3 gap-4">
          <Skeleton className="col-span-1 h-full min-h-[12rem] rounded-lg" />
          <Skeleton className="col-span-2 h-full min-h-[12rem] rounded-lg" />
        </div>
      </div>
    </AnalyticsPageShell>
  )
}
