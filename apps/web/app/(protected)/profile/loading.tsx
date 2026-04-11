import { AnalyticsPageShell } from '@/components/analytics-page-shell'
import { Skeleton } from '@workspace/ui/components/skeleton'
import { getTranslations } from 'next-intl/server'

export default async function ProfileLoading() {
  const t = await getTranslations('profile')

  return (
    <AnalyticsPageShell title={t('title')} breadcrumbs={[{ label: t('breadcrumb') }]}>
      <div className="space-y-2">
        <Skeleton className="h-8 w-48 max-w-full" />
        <Skeleton className="h-4 w-full max-w-md" />
        <div className="flex flex-col gap-6 pt-4">
          <Skeleton className="h-[5.5rem] max-w-md rounded-xl" />
          <Skeleton className="min-h-[16rem] max-w-md rounded-xl" />
        </div>
      </div>
    </AnalyticsPageShell>
  )
}
