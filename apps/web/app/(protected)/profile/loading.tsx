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
        <div className="flex flex-col gap-10 pt-4">
          <div className="flex max-w-md items-center gap-4">
            <Skeleton className="size-16 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-6 w-40 max-w-full" />
              <Skeleton className="h-4 w-56 max-w-full" />
            </div>
          </div>
          <div className="max-w-md space-y-4">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-4 w-full max-w-sm" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-9 w-32" />
          </div>
        </div>
      </div>
    </AnalyticsPageShell>
  )
}
